import 'server-only';
import type { Title } from '../types';
import { REVALIDATE, tmdbFetch } from './client';
import { mapMovie, mapTv } from './mappers';
import { attachProviders } from './providers';
import { moviePageSchema, tvPageSchema } from './schemas';

const MAX_SEARCH_RESULTS = 20;

export async function searchTitles(query: string): Promise<Title[]> {
  const text = query.trim();
  if (!text) return [];

  const options = {
    params: { query: text, include_adult: 'false', page: 1 },
    revalidate: REVALIDATE.hour,
  };
  const [movies, shows] = await Promise.all([
    tmdbFetch('/search/movie', moviePageSchema, options),
    tmdbFetch('/search/tv', tvPageSchema, options),
  ]);

  const ranked = [
    ...movies.results.map((raw) => ({ popularity: raw.popularity ?? 0, title: mapMovie(raw) })),
    ...shows.results.map((raw) => ({ popularity: raw.popularity ?? 0, title: mapTv(raw) })),
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, MAX_SEARCH_RESULTS)
    .map((item) => item.title);

  return attachProviders(ranked);
}
