import 'server-only';
import { MAX_TMDB_PAGE, type Filters, type Title, type TitlePage, type TitleType } from '../types';
import { REGION, REVALIDATE, tmdbFetch } from './client';
import { mapMovie, mapTv, mediaPath } from './mappers';
import { attachProviders } from './providers';
import { moviePageSchema, tvPageSchema } from './schemas';

/** Sem esse mínimo, títulos com 2 ou 3 votos dominam a ordenação por nota. */
const MIN_VOTES_FOR_RATING_SORT = 200;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDiscoverParams(
  tipo: TitleType,
  filters: Filters,
  page: number,
  today: Date = new Date(),
): Record<string, string> {
  const dateField = tipo === 'filme' ? 'primary_release_date' : 'first_air_date';
  const params: Record<string, string> = {
    watch_region: REGION,
    with_watch_monetization_types: 'flatrate',
    include_adult: 'false',
    page: String(page),
  };

  if (filters.streamings.length > 0) params.with_watch_providers = filters.streamings.join('|');
  if (filters.generos.length > 0) params.with_genres = filters.generos.join('|');
  if (filters.anoDe !== null) params[`${dateField}.gte`] = `${filters.anoDe}-01-01`;
  if (filters.anoAte !== null) params[`${dateField}.lte`] = `${filters.anoAte}-12-31`;
  if (filters.notaMin !== null) params['vote_average.gte'] = String(filters.notaMin);

  switch (filters.ordem) {
    case 'popularidade':
      params.sort_by = 'popularity.desc';
      break;
    case 'nota':
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = String(MIN_VOTES_FOR_RATING_SORT);
      break;
    case 'lancamento': {
      params.sort_by = `${dateField}.desc`;
      const todayIso = isoDate(today);
      const lte = params[`${dateField}.lte`];
      if (!lte || lte > todayIso) params[`${dateField}.lte`] = todayIso;
      break;
    }
  }
  return params;
}

export async function discoverTitles(tipo: TitleType, filters: Filters, page: number): Promise<TitlePage> {
  const safePage = Math.min(Math.max(1, Math.trunc(page)), MAX_TMDB_PAGE);
  const path = `/discover/${mediaPath(tipo)}`;
  const options = { params: buildDiscoverParams(tipo, filters, safePage), revalidate: REVALIDATE.sixHours };

  let result: { page: number; totalPages: number; titles: Title[] };
  if (tipo === 'filme') {
    const data = await tmdbFetch(path, moviePageSchema, options);
    result = { page: data.page, totalPages: data.total_pages, titles: data.results.map(mapMovie) };
  } else {
    const data = await tmdbFetch(path, tvPageSchema, options);
    result = { page: data.page, totalPages: data.total_pages, titles: data.results.map(mapTv) };
  }

  return {
    page: result.page,
    totalPages: Math.min(result.totalPages, MAX_TMDB_PAGE),
    titles: await attachProviders(result.titles),
  };
}
