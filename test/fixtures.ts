import type { Provider, Title } from '@/lib/types';

export const netflix: Provider = { id: 8, nome: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.png' };
export const prime: Provider = { id: 119, nome: 'Prime Video', logoUrl: null };

export function makeTitle(overrides: Partial<Title> = {}): Title {
  return {
    id: 1,
    tipo: 'filme',
    titulo: 'Filme Teste',
    ano: 2021,
    nota: 7.5,
    posterUrl: null,
    streamings: [],
    ...overrides,
  };
}
