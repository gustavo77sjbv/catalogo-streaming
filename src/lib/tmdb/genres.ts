import 'server-only';
import type { Genre, TitleType } from '../types';
import { REVALIDATE, tmdbFetch } from './client';
import { mediaPath } from './mappers';
import { genreListSchema } from './schemas';

export async function listGenres(tipo: TitleType): Promise<Genre[]> {
  const data = await tmdbFetch(`/genre/${mediaPath(tipo)}/list`, genreListSchema, {
    revalidate: REVALIDATE.week,
  });
  return data.genres
    .map((genre) => ({ id: genre.id, nome: genre.name }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
