// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, type Filters, type Genre } from '@/lib/types';
import { netflix, prime } from '../../test/fixtures';
import { FilterBar } from './FilterBar';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/filmes',
}));

const genres: Genre[] = [
  { id: 35, nome: 'Comédia' },
  { id: 18, nome: 'Drama' },
];

function renderBar(filters: Filters = DEFAULT_FILTERS) {
  render(<FilterBar filters={filters} providers={[netflix, prime]} genres={genres} />);
  return userEvent.setup();
}

describe('FilterBar', () => {
  beforeEach(() => push.mockReset());

  it('adiciona e remove streaming na URL', async () => {
    const user = renderBar();
    await user.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?streaming=8');
  });

  it('remove o streaming quando já estava selecionado', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, streamings: [8] });
    await user.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenLastCalledWith('/filmes');
  });

  it('combina gênero com os filtros existentes', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, streamings: [8] });
    await user.click(screen.getByRole('button', { name: 'Comédia' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?streaming=8&genero=35');
  });

  it('aplica ordenação e nota mínima ao mudar o select', async () => {
    const user = renderBar();
    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'nota');
    expect(push).toHaveBeenLastCalledWith('/filmes?ordem=nota');
    await user.selectOptions(screen.getByLabelText('Nota mínima'), '7');
    expect(push).toHaveBeenLastCalledWith('/filmes?notaMin=7');
  });

  it('aplica a faixa de anos no envio, corrigindo a ordem', async () => {
    const user = renderBar();
    await user.type(screen.getByLabelText('Ano de'), '2020');
    await user.type(screen.getByLabelText('Ano até'), '2010');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?anoDe=2010&anoAte=2020');
  });

  it('limpa todos os filtros', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, generos: [35], notaMin: 7 });
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(push).toHaveBeenLastCalledWith('/filmes');
  });
});
