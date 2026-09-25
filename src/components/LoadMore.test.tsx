// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, type TitlePage } from '@/lib/types';
import { makeTitle } from '../../test/fixtures';
import { LoadMore } from './LoadMore';

const fetchMock = vi.fn();

function ok(body: TitlePage) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const filters = { ...DEFAULT_FILTERS, streamings: [8] };

describe('LoadMore', () => {
  it('não mostra o botão quando já está na última página', () => {
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={1} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('busca a próxima página com os filtros e anexa os títulos', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ titles: [makeTitle({ id: 99, titulo: 'Novo Filme' })], page: 2, totalPages: 3 }));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/titles?streaming=8&tipo=filme&page=2');
    expect(await screen.findByRole('heading', { name: 'Novo Filme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('não repete um título já mostrado na página 1', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(
      ok({
        titles: [makeTitle({ id: 1, titulo: 'Já na página 1' }), makeTitle({ id: 99, titulo: 'Novo Filme' })],
        page: 2,
        totalPages: 3,
      }),
    );
    render(
      <LoadMore
        tipo="filme"
        filters={filters}
        initialPage={1}
        totalPages={3}
        initialKeys={['filme-1']}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(await screen.findByRole('heading', { name: 'Novo Filme' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Já na página 1' })).toBeNull();
  });

  it('esconde o botão depois de carregar a última página', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ titles: [makeTitle({ id: 2, titulo: 'Último' })], page: 2, totalPages: 2 }));
    render(<LoadMore tipo="serie" filters={DEFAULT_FILTERS} initialPage={1} totalPages={2} />);
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByRole('heading', { name: 'Último' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mostra erro e permite tentar de novo', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce(ok({ titles: [makeTitle({ id: 5, titulo: 'Recuperado' })], page: 2, totalPages: 3 }));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar mais títulos.');

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Recuperado' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('desabilita o botão enquanto carrega', async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled();
    resolve(ok({ titles: [], page: 2, totalPages: 3 }));
    expect(await screen.findByRole('button', { name: 'Carregar mais' })).toBeEnabled();
  });
});
