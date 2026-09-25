import 'server-only';
import type { CastMember, Provider, TitleDetails, TitleType, Trailer } from '../types';
import { REGION, REVALIDATE, TmdbError, tmdbFetch } from './client';
import { imageUrl, mediaPath, roundNota, yearFrom } from './mappers';
import { getTitleProviders } from './providers';
import { movieDetailsSchema, tvDetailsSchema, type RawMovieDetails, type RawTvDetails } from './schemas';

const MAX_CAST = 8;

type RawVideo = NonNullable<RawMovieDetails['videos']>['results'][number];
type RawCredits = RawMovieDetails['credits'];

/** Trailer do YouTube, preferindo português, depois inglês/sem idioma; teaser só como último recurso. */
function pickTrailer(videos: RawVideo[]): Trailer | null {
  const youtube = videos.filter((v) => v.site === 'YouTube');
  const score = (v: RawVideo) =>
    (v.type === 'Trailer' ? 0 : v.type === 'Teaser' ? 10 : 20) +
    (v.iso_639_1 === 'pt' ? 0 : 1) +
    (v.official === false ? 0.5 : 0);
  const best = youtube.filter((v) => v.type === 'Trailer' || v.type === 'Teaser').sort((a, b) => score(a) - score(b))[0];
  return best ? { youtubeKey: best.key, nome: best.name } : null;
}

function mapCast(credits: RawCredits): CastMember[] {
  return [...(credits?.cast ?? [])]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_CAST)
    .map((c) => ({ nome: c.name, personagem: c.character || null, fotoUrl: imageUrl(c.profile_path, 'w185') }));
}

function movieCertification(raw: RawMovieDetails): string | null {
  const br = raw.release_dates?.results.find((r) => r.iso_3166_1 === REGION);
  const certified = (br?.release_dates ?? []).filter((d) => d.certification);
  // Tipo 3 = lançamento nos cinemas; é a classificação mais estável quando há várias.
  const best = certified.find((d) => d.type === 3) ?? certified[0];
  return best?.certification ?? null;
}

function common(raw: RawMovieDetails | RawTvDetails) {
  return {
    id: raw.id,
    nota: roundNota(raw.vote_average),
    votos: raw.vote_count ?? 0,
    posterUrl: imageUrl(raw.poster_path, 'w500'),
    generos: (raw.genres ?? []).map((g) => g.name),
    sinopse: raw.overview?.trim() || null,
    trailer: pickTrailer(raw.videos?.results ?? []),
    elenco: mapCast(raw.credits),
  };
}

function mapMovieDetails(raw: RawMovieDetails, streamings: Provider[]): TitleDetails {
  return {
    ...common(raw),
    tipo: 'filme',
    titulo: raw.title,
    tituloOriginal: raw.original_title && raw.original_title !== raw.title ? raw.original_title : null,
    ano: yearFrom(raw.release_date),
    duracaoMin: raw.runtime || null,
    temporadas: null,
    episodios: null,
    classificacao: movieCertification(raw),
    direcao: [...new Set((raw.credits?.crew ?? []).filter((c) => c.job === 'Director').map((c) => c.name))],
    streamings,
  };
}

function mapTvDetails(raw: RawTvDetails, streamings: Provider[]): TitleDetails {
  return {
    ...common(raw),
    tipo: 'serie',
    titulo: raw.name,
    tituloOriginal: raw.original_name && raw.original_name !== raw.name ? raw.original_name : null,
    ano: yearFrom(raw.first_air_date),
    duracaoMin: null,
    temporadas: raw.number_of_seasons ?? null,
    episodios: raw.number_of_episodes ?? null,
    classificacao: raw.content_ratings?.results.find((r) => r.iso_3166_1 === REGION)?.rating || null,
    direcao: (raw.created_by ?? []).map((c) => c.name),
    streamings,
  };
}

async function safeProviders(tipo: TitleType, id: number): Promise<Provider[]> {
  try {
    return await getTitleProviders(tipo, id);
  } catch (error) {
    console.warn('[tmdb] falha ao buscar streamings', tipo, id, error);
    return [];
  }
}

/** Detalhes completos de um título, ou null se ele não existir no TMDB. */
export async function getTitleDetails(tipo: TitleType, id: number): Promise<TitleDetails | null> {
  const path = `/${mediaPath(tipo)}/${id}`;
  const options = {
    params: {
      append_to_response: tipo === 'filme' ? 'credits,videos,release_dates' : 'credits,videos,content_ratings',
      include_video_language: 'pt,en,null',
    },
    revalidate: REVALIDATE.day,
  };
  try {
    if (tipo === 'filme') {
      const [raw, streamings] = await Promise.all([
        tmdbFetch(path, movieDetailsSchema, options),
        safeProviders(tipo, id),
      ]);
      return mapMovieDetails(raw, streamings);
    }
    const [raw, streamings] = await Promise.all([tmdbFetch(path, tvDetailsSchema, options), safeProviders(tipo, id)]);
    return mapTvDetails(raw, streamings);
  } catch (error) {
    if (error instanceof TmdbError && error.kind === 'not_found') return null;
    throw error;
  }
}
