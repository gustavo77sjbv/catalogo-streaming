import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { makeTitle } from '../../../test/fixtures';
import { attachProviders, getTitleProviders, listStreamingProviders } from './providers';

// eslint-disable-next-line react-hooks/rules-of-hooks
useMsw();

const netflixRaw = {
  provider_id: 8,
  provider_name: 'Netflix',
  logo_path: '/n.png',
  display_priority: 5,
  display_priorities: { BR: 1 },
};
const primeRaw = {
  provider_id: 119,
  provider_name: 'Prime Video',
  logo_path: null,
  display_priority: 1,
  display_priorities: { BR: 2 },
};

describe('listStreamingProviders', () => {
  it('pede os providers do BR e ordena pela prioridade no BR', async () => {
    let region: string | null = null;
    server.use(
      http.get(`${TMDB}/watch/providers/movie`, ({ request }) => {
        region = new URL(request.url).searchParams.get('watch_region');
        return HttpResponse.json({ results: [primeRaw, netflixRaw] });
      }),
    );
    const providers = await listStreamingProviders('filme');
    expect(region).toBe('BR');
    expect(providers.map((p) => p.id)).toEqual([8, 119]);
    expect(providers[1]).toEqual({ id: 119, nome: 'Prime Video', logoUrl: null });
  });

  it('usa o endpoint de TV para séries', async () => {
    server.use(http.get(`${TMDB}/watch/providers/tv`, () => HttpResponse.json({ results: [netflixRaw] })));
    await expect(listStreamingProviders('serie')).resolves.toHaveLength(1);
  });
});

describe('getTitleProviders', () => {
  it('retorna apenas os streamings de assinatura do BR, ordenados', async () => {
    server.use(
      http.get(`${TMDB}/movie/1/watch/providers`, () =>
        HttpResponse.json({
          id: 1,
          results: {
            BR: {
              flatrate: [
                { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 5 },
                { provider_id: 119, provider_name: 'Prime Video', logo_path: null, display_priority: 1 },
              ],
            },
            US: { flatrate: [{ provider_id: 15, provider_name: 'Hulu', logo_path: null, display_priority: 1 }] },
          },
        }),
      ),
    );
    const providers = await getTitleProviders('filme', 1);
    expect(providers.map((p) => p.id)).toEqual([119, 8]);
  });

  it('retorna lista vazia sem BR ou sem flatrate', async () => {
    server.use(
      http.get(`${TMDB}/movie/2/watch/providers`, () => HttpResponse.json({ id: 2, results: {} })),
      http.get(`${TMDB}/tv/3/watch/providers`, () =>
        HttpResponse.json({ id: 3, results: { BR: { rent: [] } } }),
      ),
    );
    await expect(getTitleProviders('filme', 2)).resolves.toEqual([]);
    await expect(getTitleProviders('serie', 3)).resolves.toEqual([]);
  });
});

describe('attachProviders', () => {
  it('preenche os streamings e deixa vazio quando um título falha', async () => {
    server.use(
      http.get(`${TMDB}/movie/1/watch/providers`, () =>
        HttpResponse.json({ id: 1, results: { BR: { flatrate: [netflixRaw] } } }),
      ),
      http.get(`${TMDB}/tv/2/watch/providers`, () => new HttpResponse(null, { status: 500 })),
    );
    const [filme, serie] = await attachProviders([
      makeTitle({ id: 1, tipo: 'filme' }),
      makeTitle({ id: 2, tipo: 'serie' }),
    ]);
    expect(filme.streamings.map((p) => p.nome)).toEqual(['Netflix']);
    expect(serie.streamings).toEqual([]);
  });
});
