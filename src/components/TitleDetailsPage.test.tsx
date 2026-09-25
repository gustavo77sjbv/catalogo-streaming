import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTitleDetails: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/lib/tmdb/details', () => ({ getTitleDetails: mocks.getTitleDetails }));
vi.mock('next/navigation', () => ({ notFound: mocks.notFound, useRouter: () => ({ back: vi.fn() }) }));

import { TitleDetailsPage, titleDetailsMetadata } from './TitleDetailsPage';

describe('TitleDetailsPage', () => {
  beforeEach(() => {
    mocks.getTitleDetails.mockReset();
    mocks.notFound.mockClear();
  });

  it('dá "não encontrado" para ID inválido, sem chamar o TMDB', async () => {
    await expect(TitleDetailsPage({ tipo: 'filme', rawId: 'abc' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getTitleDetails).not.toHaveBeenCalled();
  });

  it('dá "não encontrado" quando o TMDB não conhece o título', async () => {
    mocks.getTitleDetails.mockResolvedValue(null);
    await expect(TitleDetailsPage({ tipo: 'serie', rawId: '999' })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getTitleDetails).toHaveBeenCalledWith('serie', 999);
  });

  it('usa título e ano no título da aba', async () => {
    mocks.getTitleDetails.mockResolvedValue({ titulo: 'Duna', ano: 2021, sinopse: 'Arrakis.' });
    await expect(titleDetailsMetadata('filme', '1')).resolves.toEqual({
      title: 'Duna (2021)',
      description: 'Arrakis.',
    });
    await expect(titleDetailsMetadata('filme', 'abc')).resolves.toEqual({ title: 'Título não encontrado' });
  });
});
