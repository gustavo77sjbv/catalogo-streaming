// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchBox } from './SearchBox';

describe('SearchBox', () => {
  it('envia o campo q para /busca via GET', () => {
    render(<SearchBox />);
    const input = screen.getByRole('searchbox', { name: 'Buscar filme ou série' });
    expect(input).toHaveAttribute('name', 'q');
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/busca');
    expect(form).toHaveAttribute('method', 'get');
  });
});
