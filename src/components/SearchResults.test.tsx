// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTitle, netflix } from '../../test/fixtures';

const { searchTitles } = vi.hoisted(() => ({ searchTitles: vi.fn() }));
vi.mock('@/lib/tmdb/search', () => ({ searchTitles }));

import { SearchResults } from './SearchResults';

describe('SearchResults', () => {
  beforeEach(() => searchTitles.mockReset());

  it('pede um texto quando a busca está vazia, sem chamar a API', async () => {
    render(await SearchResults({ query: '' }));
    expect(screen.getByText('Digite o nome de um filme ou série para buscar.')).toBeInTheDocument();
    expect(searchTitles).not.toHaveBeenCalled();
  });

  it('mostra resultados com streamings e aviso para os indisponíveis', async () => {
    searchTitles.mockResolvedValue([
      makeTitle({ id: 1, titulo: 'Duna', streamings: [netflix] }),
      makeTitle({ id: 2, titulo: 'Duna (1984)', streamings: [] }),
    ]);

    render(await SearchResults({ query: 'duna' }));

    expect(searchTitles).toHaveBeenCalledWith('duna');
    expect(screen.getByRole('heading', { name: 'Resultados para "duna"' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
    expect(screen.getByText('Não disponível em streaming no Brasil')).toBeInTheDocument();
  });

  it('avisa quando nada foi encontrado', async () => {
    searchTitles.mockResolvedValue([]);
    render(await SearchResults({ query: 'xyzzy' }));
    expect(screen.getByText('Nenhum título encontrado para "xyzzy".')).toBeInTheDocument();
  });
});
