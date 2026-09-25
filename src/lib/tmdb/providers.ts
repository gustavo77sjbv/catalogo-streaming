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

/**
 * IDs de lojas de aluguel/compra (TVOD) bem conhecidas no TMDB. `/watch/providers/{movie|tv}`
 * lista todos os provedores de watch_region=BR independente do tipo de monetização, mas o
 * discover sempre filtra por `flatrate` (assinatura); sem esse filtro, chips como "Apple TV"
 * levariam a resultados vazios. Confirmar estes IDs contra o endpoint real do TMDB antes de
 * ampliar a lista: 2 (Apple TV store), 3 (Google Play Filmes), 10 (Amazon Video),
 * 68 (Microsoft Store), 192 (YouTube).
 */
const TVOD_STORE_IDS = new Set([2, 3, 10, 68, 192]);

export async function listStreamingProviders(tipo: TitleType): Promise<Provider[]> {
  const data = await tmdbFetch(`/watch/providers/${mediaPath(tipo)}`, providerListSchema, {
    params: { watch_region: REGION },
    revalidate: REVALIDATE.week,
  });
  return data.results
    .filter((raw) => !TVOD_STORE_IDS.has(raw.provider_id))
    .sort(byPriority)
    .map(mapProvider);
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
    if (result.status === 'rejected') {
      console.warn('[tmdb] falha ao buscar streamings', title.tipo, title.id, result.reason);
      return { ...title, streamings: [] };
    }
    return { ...title, streamings: result.value };
  });
}
