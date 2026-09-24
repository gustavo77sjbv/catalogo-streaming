import { describe, expect, it } from 'vitest';
import { mapMovie, mapProvider, mapTv, mediaPath, yearFrom } from './mappers';

describe('mappers', () => {
  it('converte filme do TMDB em Title', () => {
    expect(
      mapMovie({
        id: 1,
        title: 'Duna',
        release_date: '2021-10-21',
        vote_average: 7.756,
        poster_path: '/duna.jpg',
        popularity: 10,
      }),
    ).toEqual({
      id: 1,
      tipo: 'filme',
      titulo: 'Duna',
      ano: 2021,
      nota: 7.8,
      posterUrl: 'https://image.tmdb.org/t/p/w342/duna.jpg',
      streamings: [],
    });
  });

  it('converte série do TMDB em Title', () => {
    expect(
      mapTv({ id: 2, name: 'Dark', first_air_date: '2017-12-01', vote_average: 8.4, poster_path: null }),
    ).toEqual({ id: 2, tipo: 'serie', titulo: 'Dark', ano: 2017, nota: 8.4, posterUrl: null, streamings: [] });
  });

  it('tolera campos ausentes ou vazios', () => {
    expect(mapMovie({ id: 3, title: 'Sem dados', release_date: '' })).toMatchObject({
      ano: null,
      nota: 0,
      posterUrl: null,
    });
  });

  it('converte provider com e sem logo', () => {
    expect(mapProvider({ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' })).toEqual({
      id: 8,
      nome: 'Netflix',
      logoUrl: 'https://image.tmdb.org/t/p/w92/n.png',
    });
    expect(mapProvider({ provider_id: 9, provider_name: 'Sem Logo', logo_path: null }).logoUrl).toBeNull();
  });

  it('extrai o ano apenas de datas no formato AAAA-MM-DD', () => {
    expect(yearFrom('1999-03-31')).toBe(1999);
    expect(yearFrom('')).toBeNull();
    expect(yearFrom(null)).toBeNull();
    expect(yearFrom('em breve')).toBeNull();
  });

  it('traduz o tipo para o caminho do TMDB', () => {
    expect(mediaPath('filme')).toBe('movie');
    expect(mediaPath('serie')).toBe('tv');
  });
});
