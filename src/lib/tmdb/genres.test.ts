import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { listGenres } from './genres';

// eslint-disable-next-line react-hooks/rules-of-hooks
useMsw();

describe('listGenres', () => {
  it('converte e ordena os gêneros por nome em pt-BR', async () => {
    server.use(
      http.get(`${TMDB}/genre/tv/list`, () =>
        HttpResponse.json({
          genres: [
            { id: 18, name: 'Drama' },
            { id: 16, name: 'Animação' },
          ],
        }),
      ),
    );
    await expect(listGenres('serie')).resolves.toEqual([
      { id: 16, nome: 'Animação' },
      { id: 18, nome: 'Drama' },
    ]);
  });
});
