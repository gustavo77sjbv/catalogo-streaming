import type { Provider, Title, TitleType } from '../types';
import type { RawMovie, RawProvider, RawTv } from './schemas';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function mediaPath(tipo: TitleType): 'movie' | 'tv' {
  return tipo === 'filme' ? 'movie' : 'tv';
}

export function yearFrom(date: string | null | undefined): number | null {
  const match = date?.match(/^(\d{4})-\d{2}-\d{2}/);
  return match ? Number(match[1]) : null;
}

export function roundNota(value: number | null | undefined): number {
  return Math.round((value ?? 0) * 10) / 10;
}

/** URL de imagem do CDN do TMDB no tamanho pedido (w92, w185, w342, w500...). */
export function imageUrl(path: string | null | undefined, size: string): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

function posterUrl(path: string | null | undefined): string | null {
  return imageUrl(path, 'w342');
}

export function mapMovie(raw: RawMovie): Title {
  return {
    id: raw.id,
    tipo: 'filme',
    titulo: raw.title,
    ano: yearFrom(raw.release_date),
    nota: roundNota(raw.vote_average),
    posterUrl: posterUrl(raw.poster_path),
    streamings: [],
  };
}

export function mapTv(raw: RawTv): Title {
  return {
    id: raw.id,
    tipo: 'serie',
    titulo: raw.name,
    ano: yearFrom(raw.first_air_date),
    nota: roundNota(raw.vote_average),
    posterUrl: posterUrl(raw.poster_path),
    streamings: [],
  };
}

export function mapProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    nome: raw.provider_name,
    logoUrl: raw.logo_path ? `${IMAGE_BASE}/w92${raw.logo_path}` : null,
  };
}
