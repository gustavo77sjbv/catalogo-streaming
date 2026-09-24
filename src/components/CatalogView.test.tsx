// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/types';
import { makeTitle, netflix } from '../../test/fixtures';

const mocks = vi.hoisted(() => ({
  discoverTitles: vi.fn(),
  listStreamingProviders: vi.fn(),
  listGenres: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/tmdb/catalog', () => ({ discoverTitles: mocks.discoverTitles }));
vi.mock('@/lib/tmdb/providers', () => ({ listStreamingProviders: mocks.listStreamingProviders }));
vi.mock('@/lib/tmdb/genres', () => ({ listGenres: mocks.listGenres }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/filmes',
}));

import { CatalogView } from './CatalogView';

describe('CatalogView', () => {
  beforeEach(() => {
    mocks.discoverTitles.mockReset();
    mocks.listStreamingProviders.mockResolvedValue([netflix]);
    mocks.listGenres.mockResolvedValue([{ id: 35, nome: 'Comédia' }]);
  });

  it('busca a página 1 com os filtros da URL e mostra os títulos', async () => {
    mocks.discoverTitles.mockResolvedValue({ titles: [makeTitle({ titulo: 'Duna' })], page: 1, totalPages: 3 });

    render(await CatalogView({ tipo: 'filme', searchParams: { genero: '35' } }));

    expect(mocks.discoverTitles).toHaveBeenCalledWith('filme', { ...DEFAULT_FILTERS, generos: [35] }, 1);
    expect(screen.getByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comédia' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Filmes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('mostra estado vazio com link para limpar os filtros', async () => {
    mocks.discoverTitles.mockResolvedValue({ titles: [], page: 1, totalPages: 0 });

    render(await CatalogView({ tipo: 'serie', searchParams: { notaMin: '9' } }));

    expect(screen.getByText('Nenhum título encontrado com esses filtros.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/series');
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
  });
});
