import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { getTitleDetails } from './details';

// eslint-disable-next-line react-hooks/rules-of-hooks
useMsw();

const movie = {
  id: 1,
  title: 'Duna',
  original_title: 'Dune',
  release_date: '2021-10-21',
  vote_average: 7.756,
  vote_count: 12345,
  poster_path: '/duna.jpg',
  genres: [
    { id: 878, name: 'Ficção científica' },
    { id: 12, name: 'Aventura' },
  ],
  runtime: 155,
  overview: 'Paul Atreides viaja para Arrakis.',
  credits: {
    cast: [
      { name: 'Zendaya', character: 'Chani', profile_path: null, order: 1 },
      { name: 'Timothée Chalamet', character: 'Paul Atreides', profile_path: '/tc.jpg', order: 0 },
    ],
    crew: [
      { name: 'Denis Villeneuve', job: 'Director' },
      { name: 'Hans Zimmer', job: 'Original Music Composer' },
    ],
  },
  videos: {
    results: [
      { key: 'teaser1', site: 'YouTube', type: 'Teaser', name: 'Teaser', iso_639_1: 'pt', official: true },
      { key: 'en1', site: 'YouTube', type: 'Trailer', name: 'Official Trailer', iso_639_1: 'en', official: true },
      { key: 'pt1', site: 'YouTube', type: 'Trailer', name: 'Trailer Dublado', iso_639_1: 'pt', official: true },
      { key: 'vimeo1', site: 'Vimeo', type: 'Trailer', name: 'Vimeo', iso_639_1: 'pt', official: true },
    ],
  },
  release_dates: {
    results: [
      { iso_3166_1: 'US', release_dates: [{ certification: 'PG-13', type: 3 }] },
      {
        iso_3166_1: 'BR',
        release_dates: [
          { certification: '', type: 1 },
          { certification: '14', type: 3 },
        ],
      },
    ],
  },
};

const show = {
  id: 10,
  name: 'Dark',
  original_name: 'Dark',
  first_air_date: '2017-12-01',
  vote_average: 8.4,
  vote_count: 800,
  poster_path: null,
  genres: [{ id: 18, name: 'Drama' }],
  number_of_seasons: 3,
  number_of_episodes: 26,
  overview: '',
  created_by: [{ name: 'Baran bo Odar' }, { name: 'Jantje Friese' }],
  credits: { cast: [], crew: [] },
  videos: { results: [] },
  content_ratings: {
    results: [
      { iso_3166_1: 'US', rating: 'TV-MA' },
      { iso_3166_1: 'BR', rating: '16' },
    ],
  },
};

const providersOk = http.get(`${TMDB}/:media/:id/watch/providers`, ({ params }) =>
  HttpResponse.json({
    id: Number(params.id),
    results: { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 }] } },
  }),
);

describe('getTitleDetails', () => {
  it('pede detalhes, elenco, vídeos e classificação numa única chamada', async () => {
    let received: URLSearchParams | undefined;
    server.use(
      http.get(`${TMDB}/movie/1`, ({ request }) => {
        received = new URL(request.url).searchParams;
        return HttpResponse.json(movie);
      }),
      providersOk,
    );
    await getTitleDetails('filme', 1);
    expect(received?.get('append_to_response')).toBe('credits,videos,release_dates');
    expect(received?.get('include_video_language')).toBe('pt,en,null');
  });

  it('converte um filme com todos os dados', async () => {
    server.use(http.get(`${TMDB}/movie/1`, () => HttpResponse.json(movie)), providersOk);

    const details = await getTitleDetails('filme', 1);

    expect(details).toEqual({
      id: 1,
      tipo: 'filme',
      titulo: 'Duna',
      tituloOriginal: 'Dune',
      ano: 2021,
      nota: 7.8,
      votos: 12345,
      posterUrl: 'https://image.tmdb.org/t/p/w500/duna.jpg',
      generos: ['Ficção científica', 'Aventura'],
      duracaoMin: 155,
      temporadas: null,
      episodios: null,
      sinopse: 'Paul Atreides viaja para Arrakis.',
      classificacao: '14',
      trailer: { youtubeKey: 'pt1', nome: 'Trailer Dublado' },
      direcao: ['Denis Villeneuve'],
      elenco: [
        { nome: 'Timothée Chalamet', personagem: 'Paul Atreides', fotoUrl: 'https://image.tmdb.org/t/p/w185/tc.jpg' },
        { nome: 'Zendaya', personagem: 'Chani', fotoUrl: null },
      ],
      streamings: [{ id: 8, nome: 'Netflix', logoUrl: null }],
    });
  });

  it('converte uma série: criadores, temporadas e classificação do BR', async () => {
    server.use(http.get(`${TMDB}/tv/10`, () => HttpResponse.json(show)), providersOk);

    const details = await getTitleDetails('serie', 10);

    expect(details).toMatchObject({
      tipo: 'serie',
      titulo: 'Dark',
      tituloOriginal: null,
      posterUrl: null,
      duracaoMin: null,
      temporadas: 3,
      episodios: 26,
      sinopse: null,
      classificacao: '16',
      trailer: null,
      direcao: ['Baran bo Odar', 'Jantje Friese'],
      elenco: [],
    });
  });

  it('usa trailer em inglês quando não há em português, e teaser como último recurso', async () => {
    const semPt = {
      ...movie,
      videos: {
        results: [
          { key: 'teaser1', site: 'YouTube', type: 'Teaser', name: 'Teaser', iso_639_1: 'pt' },
          { key: 'en1', site: 'YouTube', type: 'Trailer', name: 'Official Trailer', iso_639_1: 'en' },
        ],
      },
    };
    const soTeaser = {
      ...movie,
      id: 2,
      videos: { results: [{ key: 'teaser1', site: 'YouTube', type: 'Teaser', name: 'Teaser', iso_639_1: 'pt' }] },
    };
    server.use(
      http.get(`${TMDB}/movie/1`, () => HttpResponse.json(semPt)),
      http.get(`${TMDB}/movie/2`, () => HttpResponse.json(soTeaser)),
      providersOk,
    );
    expect((await getTitleDetails('filme', 1))?.trailer).toEqual({ youtubeKey: 'en1', nome: 'Official Trailer' });
    expect((await getTitleDetails('filme', 2))?.trailer).toEqual({ youtubeKey: 'teaser1', nome: 'Teaser' });
  });

  it('limita o elenco a 8 pessoas, na ordem de créditos', async () => {
    const cast = Array.from({ length: 12 }, (_, i) => ({
      name: `Ator ${i}`,
      character: `Papel ${i}`,
      profile_path: null,
      order: 11 - i,
    }));
    server.use(
      http.get(`${TMDB}/movie/1`, () => HttpResponse.json({ ...movie, credits: { cast, crew: [] } })),
      providersOk,
    );
    const details = await getTitleDetails('filme', 1);
    expect(details?.elenco).toHaveLength(8);
    expect(details?.elenco[0].nome).toBe('Ator 11');
  });

  it('retorna null quando o título não existe', async () => {
    server.use(http.get(`${TMDB}/movie/999`, () => new HttpResponse(null, { status: 404 })));
    await expect(getTitleDetails('filme', 999)).resolves.toBeNull();
  });

  it('propaga falhas do TMDB que não são 404', async () => {
    server.use(http.get(`${TMDB}/movie/1`, () => new HttpResponse(null, { status: 503 })), providersOk);
    await expect(getTitleDetails('filme', 1)).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('mostra a página mesmo se a busca de streamings falhar', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    server.use(
      http.get(`${TMDB}/movie/1`, () => HttpResponse.json(movie)),
      http.get(`${TMDB}/movie/1/watch/providers`, () => new HttpResponse(null, { status: 500 })),
    );
    const details = await getTitleDetails('filme', 1);
    expect(details?.titulo).toBe('Duna');
    expect(details?.streamings).toEqual([]);
    expect(console.warn).toHaveBeenCalled();
  });
});
