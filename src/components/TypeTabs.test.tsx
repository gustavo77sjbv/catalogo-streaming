// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypeTabs } from './TypeTabs';

describe('TypeTabs', () => {
  it('marca a aba ativa e aponta para as rotas sem filtros', () => {
    render(<TypeTabs ativo="serie" />);
    const filmes = screen.getByRole('link', { name: 'Filmes' });
    const series = screen.getByRole('link', { name: 'Séries' });
    expect(filmes).toHaveAttribute('href', '/filmes');
    expect(filmes).not.toHaveAttribute('aria-current');
    expect(series).toHaveAttribute('href', '/series');
    expect(series).toHaveAttribute('aria-current', 'page');
  });
});
