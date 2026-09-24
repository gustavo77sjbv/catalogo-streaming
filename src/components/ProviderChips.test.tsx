// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Provider } from '@/lib/types';
import { ProviderChips } from './ProviderChips';

const doze: Provider[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  nome: `Streaming ${i + 1}`,
  logoUrl: null,
}));

describe('ProviderChips', () => {
  it('mostra os 10 primeiros e expande com "Ver mais"', async () => {
    const user = userEvent.setup();
    render(<ProviderChips providers={doze} selected={[]} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Streaming 10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Streaming 11' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ver mais (2)' }));

    expect(screen.getByRole('button', { name: 'Streaming 12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });

  it('mantém visível um streaming selecionado fora dos 10 primeiros', () => {
    render(<ProviderChips providers={doze} selected={[12]} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Streaming 12' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Streaming 11' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver mais (1)' })).toBeInTheDocument();
  });

  it('chama onToggle com o id e marca os selecionados', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ProviderChips providers={doze} selected={[2]} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Streaming 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Streaming 3' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Streaming 3' }));
    expect(onToggle).toHaveBeenCalledWith(3);
  });

  it('não mostra "Ver mais" com 10 streamings ou menos', () => {
    render(<ProviderChips providers={doze.slice(0, 10)} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByRole('button', { name: /Ver mais/ })).toBeNull();
  });
});
