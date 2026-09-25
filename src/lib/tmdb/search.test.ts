import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { searchTitles } from './search';

// eslint-disable-next-line react-hooks/rules-of-hooks
useMsw();

const noProviders = http.get(`${TMDB}/:media/:id/watch/providers`, ({ params }) =>
  HttpResponse.json({ id: Number(params.id), results: {} }),
);

function pageOf(results: unknown[]) {
  return { page: 1, total_pages: 1, results };
}

describe('searchTitles', () => {
  it('não chama a API para texto vazio ou só com espaços', async () => {
    await expect(searchTitles('')).resolves.toEqual([]);
    await expect(searchTitles('    ')).resolves.toEqual([]);
  });

  it('junta filmes e séries ordenados por popularidade', async () => {
    server.use(
      http.get(`${TMDB}/search/movie`, () =>
        HttpResponse.json(
          pageOf([
            { id: 1, title: 'Filme A', popularity: 10 },
            { id: 2, title: 'Filme B', popularity: 50 },
          ]),
        ),
      ),
      http.get(`${TMDB}/search/tv`, () => HttpResponse.json(pageOf([{ id: 3, name: 'Série C', popularity: 30 }]))),
      noProviders,
    );

    const titles = await searchTitles('teste');

    expect(titles.map((t) => [t.titulo, t.tipo])).toEqual([
      ['Filme B', 'filme'],
      ['Série C', 'serie'],
      ['Filme A', 'filme'],
    ]);
  });

  it('limita o resultado a 20 títulos', async () => {
    const movies = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, title: `F${i}`, popularity: i }));
    const shows = Array.from({ length: 15 }, (_, i) => ({ id: i + 100, name: `S${i}`, popularity: i }));
    server.use(
      http.get(`${TMDB}/search/movie`, () => HttpResponse.json(pageOf(movies))),
      http.get(`${TMDB}/search/tv`, () => HttpResponse.json(pageOf(shows))),
      noProviders,
    );
    await expect(searchTitles('x')).resolves.toHaveLength(20);
  });

  it('envia o texto aparado, com acentos e & codificados corretamente', async () => {
    const queries: (string | null)[] = [];
    const capture = (request: Request) => {
      queries.push(new URL(request.url).searchParams.get('query'));
      return HttpResponse.json(pageOf([]));
    };
    server.use(
      http.get(`${TMDB}/search/movie`, ({ request }) => capture(request)),
      http.get(`${TMDB}/search/tv`, ({ request }) => capture(request)),
    );
    await searchTitles('  Amélie & cia ');
    expect(queries).toEqual(['Amélie & cia', 'Amélie & cia']);
  });
});
