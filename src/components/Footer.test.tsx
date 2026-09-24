// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('exibe os créditos exigidos pelo TMDB e pela JustWatch', () => {
    render(<Footer />);
    expect(screen.getByRole('img', { name: 'The Movie Database (TMDB)' })).toBeInTheDocument();
    expect(
      screen.getByText('Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com');
  });
});
