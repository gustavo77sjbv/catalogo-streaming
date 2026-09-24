import 'server-only';
import type { Provider, Title, TitleType } from '../types';
import { REGION, REVALIDATE, tmdbFetch } from './client';
import { mapProvider, mediaPath } from './mappers';
import { providerListSchema, titleProvidersSchema, type RawProvider } from './schemas';

function priority(raw: RawProvider): number {
  return raw.display_priorities?.[REGION] ?? raw.display_priority ?? Number.MAX_SAFE_INTEGER;
}

function byPriority(a: RawProvider, b: RawProvider): number {
  return priority(a) - priority(b);
}

export async function listStreamingProviders(tipo: TitleType): Promise<Provider[]> {
  const data = await tmdbFetch(`/watch/providers/${mediaPath(tipo)}`, providerListSchema, {
    params: { watch_region: REGION },
    revalidate: REVALIDATE.week,
  });
  return [...data.results].sort(byPriority).map(mapProvider);
}

export async function getTitleProviders(tipo: TitleType, id: number): Promise<Provider[]> {
  const data = await tmdbFetch(`/${mediaPath(tipo)}/${id}/watch/providers`, titleProvidersSchema, {
    revalidate: REVALIDATE.day,
  });
  const flatrate = data.results[REGION]?.flatrate ?? [];
  return [...flatrate].sort(byPriority).map(mapProvider);
}

/** Busca os streamings de cada título em paralelo; uma falha deixa só aquele título sem streamings. */
export async function attachProviders(titles: Title[]): Promise<Title[]> {
  const results = await Promise.allSettled(titles.map((title) => getTitleProviders(title.tipo, title.id)));
  return titles.map((title, index) => {
    const result = results[index];
    return { ...title, streamings: result.status === 'fulfilled' ? result.value : [] };
  });
}
