import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { DEFAULT_FILTERS, type Filters } from '../types';
import { buildDiscoverParams, discoverTitles } from './catalog';

// eslint-disable-next-line react-hooks/rules-of-hooks
useMsw();

const today = new Date('2026-09-23T12:00:00Z');
const base = {
  watch_region: 'BR',
  with_watch_monetization_types: 'flatrate',
  include_adult: 'false',
};

describe('buildDiscoverParams', () => {
  it('usa só região, flatrate e popularidade quando não há filtros', () => {
    expect(buildDiscoverParams('filme', DEFAULT_FILTERS, 1, today)).toEqual({
      ...base,
      page: '1',
      sort_by: 'popularity.desc',
    });
  });

  it('traduz todos os filtros para filmes (streamings e gêneros com OU)', () => {
    const filters: Filters = {
      streamings: [8, 119],
      generos: [35, 18],
      anoDe: 2010,
      anoAte: 2024,
      notaMin: 7,
      ordem: 'popularidade',
    };
    expect(buildDiscoverParams('filme', filters, 3, today)).toEqual({
      ...base,
      page: '3',
      sort_by: 'popularity.desc',
      with_watch_providers: '8|119',
      with_genres: '35|18',
      'primary_release_date.gte': '2010-01-01',
      'primary_release_date.lte': '2024-12-31',
      'vote_average.gte': '7',
    });
  });

  it('usa first_air_date para séries', () => {
    const params = buildDiscoverParams('serie', { ...DEFAULT_FILTERS, anoDe: 2015, anoAte: 2020 }, 1, today);
    expect(params['first_air_date.gte']).toBe('2015-01-01');
    expect(params['first_air_date.lte']).toBe('2020-12-31');
    expect(params).not.toHaveProperty('primary_release_date.gte');
  });

  it('ordenar por nota exige no mínimo 200 votos', () => {
    const params = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'nota' }, 1, today);
    expect(params.sort_by).toBe('vote_average.desc');
    expect(params['vote_count.gte']).toBe('200');
  });

  it('ordenar por lançamento esconde títulos futuros', () => {
    const lancamento = { ...DEFAULT_FILTERS, ordem: 'lancamento' as const };
    const filme = buildDiscoverParams('filme', lancamento, 1, today);
    expect(filme.sort_by).toBe('primary_release_date.desc');
    expect(filme['primary_release_date.lte']).toBe('2026-09-23');

    const serie = buildDiscoverParams('serie', lancamento, 1, today);
    expect(serie.sort_by).toBe('first_air_date.desc');
    expect(serie['first_air_date.lte']).toBe('2026-09-23');
  });

  it('em lançamento, mantém anoAte do passado e limita anoAte do futuro a hoje', () => {
    const passado = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'lancamento', anoAte: 2020 }, 1, today);
    expect(passado['primary_release_date.lte']).toBe('2020-12-31');
    const futuro = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'lancamento', anoAte: 2030 }, 1, today);
    expect(futuro['primary_release_date.lte']).toBe('2026-09-23');
  });
});

describe('discoverTitles', () => {
  function providersHandler() {
    return http.get(`${TMDB}/:media/:id/watch/providers`, ({ params }) =>
      HttpResponse.json({
        id: Number(params.id),
        results:
          params.id === '1'
            ? { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 }] } }
            : {},
      }),
    );
  }

  it('busca filmes, anexa streamings e limita totalPages a 500', async () => {
    let received: URLSearchParams | undefined;
    server.use(
      http.get(`${TMDB}/discover/movie`, ({ request }) => {
        received = new URL(request.url).searchParams;
        return HttpResponse.json({
          page: 2,
          total_pages: 900,
          results: [
            { id: 1, title: 'Com Netflix', release_date: '2020-01-01', vote_average: 7, poster_path: null },
            { id: 2, title: 'Sem Logos', release_date: '2019-01-01', vote_average: 6, poster_path: null },
          ],
        });
      }),
      providersHandler(),
    );

    const result = await discoverTitles('filme', { ...DEFAULT_FILTERS, generos: [35] }, 2);

    expect(received?.get('page')).toBe('2');
    expect(received?.get('with_genres')).toBe('35');
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(500);
    expect(result.titles.map((t) => t.titulo)).toEqual(['Com Netflix', 'Sem Logos']);
    expect(result.titles[0].streamings.map((p) => p.nome)).toEqual(['Netflix']);
    expect(result.titles[1].streamings).toEqual([]);
  });

  it('busca séries no endpoint de TV', async () => {
    server.use(
      http.get(`${TMDB}/discover/tv`, () =>
        HttpResponse.json({ page: 1, total_pages: 1, results: [{ id: 5, name: 'Dark', first_air_date: '2017-12-01' }] }),
      ),
      providersHandler(),
    );
    const result = await discoverTitles('serie', DEFAULT_FILTERS, 1);
    expect(result.titles[0]).toMatchObject({ tipo: 'serie', titulo: 'Dark', ano: 2017 });
  });

  it('limita a página pedida a 500', async () => {
    let page: string | null = null;
    server.use(
      http.get(`${TMDB}/discover/movie`, ({ request }) => {
        page = new URL(request.url).searchParams.get('page');
        return HttpResponse.json({ page: 500, total_pages: 500, results: [] });
      }),
    );
    await discoverTitles('filme', DEFAULT_FILTERS, 9999);
    expect(page).toBe('500');
  });
});
