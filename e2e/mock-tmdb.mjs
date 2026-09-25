import http from 'node:http';

const port = Number(process.env.MOCK_PORT ?? 4010);

const providers = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1, display_priorities: { BR: 1 } },
  { provider_id: 119, provider_name: 'Prime Video', logo_path: null, display_priority: 2, display_priorities: { BR: 2 } },
];

const movies = [
  { id: 1, title: 'Comédia Teste', release_date: '2021-05-01', vote_average: 7.8, poster_path: null, popularity: 50, genre_ids: [35] },
  { id: 2, title: 'Drama Teste', release_date: '2019-03-10', vote_average: 8.1, poster_path: null, popularity: 40, genre_ids: [18] },
];

// Aparece só na busca: o discover real só devolve títulos que estão em streaming.
const searchOnlyMovies = [
  { id: 3, title: 'Filme Sem Streaming', release_date: '2010-01-01', vote_average: 6, poster_path: null, popularity: 5 },
];

const shows = [
  { id: 10, name: 'Série Teste', first_air_date: '2020-01-01', vote_average: 8.5, poster_path: null, popularity: 60, genre_ids: [18] },
];

const titleProviders = {
  'movie/1': [providers[0]],
  'movie/2': [providers[1]],
  'tv/10': [providers[0]],
};

function page(results) {
  return { page: 1, total_pages: 1, total_results: results.length, results };
}

function byGenre(list, withGenres) {
  if (!withGenres) return list;
  const ids = withGenres.split('|').map(Number);
  return list.filter((item) => item.genre_ids.some((id) => ids.includes(id)));
}

function byProvider(list, media, withProviders) {
  if (!withProviders) return list;
  const ids = withProviders.split('|').map(Number);
  return list.filter((item) => (titleProviders[`${media}/${item.id}`] ?? []).some((p) => ids.includes(p.provider_id)));
}

function matches(text, query) {
  return text.toLowerCase().includes((query ?? '').toLowerCase());
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (req.headers.authorization !== 'Bearer e2e-token') return send(401, { status_message: 'token inválido' });

  const path = url.pathname.replace(/^\/3/, '');
  const q = url.searchParams;

  if (path === '/genre/movie/list' || path === '/genre/tv/list') {
    return send(200, { genres: [{ id: 35, name: 'Comédia' }, { id: 18, name: 'Drama' }] });
  }
  if (path === '/watch/providers/movie' || path === '/watch/providers/tv') {
    return send(200, { results: providers });
  }
  if (path === '/discover/movie') {
    return send(200, page(byProvider(byGenre(movies, q.get('with_genres')), 'movie', q.get('with_watch_providers'))));
  }
  if (path === '/discover/tv') {
    return send(200, page(byProvider(byGenre(shows, q.get('with_genres')), 'tv', q.get('with_watch_providers'))));
  }
  if (path === '/search/movie') {
    return send(200, page([...movies, ...searchOnlyMovies].filter((m) => matches(m.title, q.get('query')))));
  }
  if (path === '/search/tv') {
    return send(200, page(shows.filter((s) => matches(s.name, q.get('query')))));
  }
  const match = path.match(/^\/(movie|tv)\/(\d+)\/watch\/providers$/);
  if (match) {
    const flatrate = titleProviders[`${match[1]}/${match[2]}`];
    return send(200, { id: Number(match[2]), results: flatrate ? { BR: { link: '', flatrate } } : {} });
  }
  const details = path.match(/^\/(movie|tv)\/(\d+)$/);
  if (details) {
    const [, media, id] = details;
    const item = (media === 'movie' ? [...movies, ...searchOnlyMovies] : shows).find((t) => t.id === Number(id));
    if (!item) return send(404, { status_message: 'não encontrado' });
    const extra = {
      vote_count: 100,
      genres: [{ id: 35, name: 'Comédia' }],
      overview: `Sinopse de ${item.title ?? item.name}.`,
      credits: { cast: [{ name: 'Atriz Teste', character: 'Protagonista', profile_path: null, order: 0 }], crew: [] },
      videos: { results: [] },
    };
    return send(
      200,
      media === 'movie'
        ? {
            ...item,
            ...extra,
            original_title: item.title,
            runtime: 100,
            release_dates: { results: [{ iso_3166_1: 'BR', release_dates: [{ certification: '12', type: 3 }] }] },
          }
        : { ...item, ...extra, original_name: item.name, number_of_seasons: 2, number_of_episodes: 16, created_by: [] },
    );
  }
  return send(404, { status_message: 'não encontrado' });
});

server.listen(port, () => console.log(`TMDB falso em http://localhost:${port}`));
