import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/types';

const { discoverTitles } = vi.hoisted(() => ({ discoverTitles: vi.fn() }));
vi.mock('@/lib/tmdb/catalog', () => ({ discoverTitles }));

import { GET } from './route';

function get(query: string) {
  return GET(new Request(`http://localhost/api/titles?${query}`));
}

describe('GET /api/titles', () => {
  beforeEach(() => {
    discoverTitles.mockReset();
  });

  it('retorna 400 para tipo inválido', async () => {
    const response = await get('tipo=anime&page=2');
    expect(response.status).toBe(400);
    expect(discoverTitles).not.toHaveBeenCalled();
  });

  it('repassa tipo, filtros e página e devolve o JSON', async () => {
    const page = { titles: [], page: 2, totalPages: 5 };
    discoverTitles.mockResolvedValue(page);

    const response = await get('tipo=serie&page=2&genero=35');

    expect(discoverTitles).toHaveBeenCalledWith('serie', { ...DEFAULT_FILTERS, generos: [35] }, 2);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
  });

  it('usa página 1 quando page é inválida', async () => {
    discoverTitles.mockResolvedValue({ titles: [], page: 1, totalPages: 1 });
    await get('tipo=filme&page=abc');
    expect(discoverTitles).toHaveBeenCalledWith('filme', DEFAULT_FILTERS, 1);
  });

  it('retorna 502 quando o TMDB falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    discoverTitles.mockRejectedValue(new Error('TMDB fora'));
    const response = await get('tipo=filme&page=2');
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Falha ao consultar o catálogo' });
  });
});
