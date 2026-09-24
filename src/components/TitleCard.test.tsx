// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTitle, netflix, prime } from '../../test/fixtures';
import { TitleCard } from './TitleCard';

describe('TitleCard', () => {
  it('mostra pôster, título, ano, nota e logos dos streamings', () => {
    render(
      <TitleCard
        title={makeTitle({
          titulo: 'Duna',
          ano: 2021,
          nota: 7.8,
          posterUrl: 'https://image.tmdb.org/t/p/w342/duna.jpg',
          streamings: [netflix],
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pôster de Duna' })).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w342/duna.jpg',
    );
    expect(screen.getByText('2021 · ★ 7,8')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
  });

  it('usa placeholder sem pôster e "Ano desconhecido" sem data', () => {
    render(<TitleCard title={makeTitle({ titulo: 'Raro', ano: null, nota: 0, posterUrl: null })} />);
    expect(screen.queryByRole('img', { name: /Pôster/ })).toBeNull();
    expect(screen.getAllByText('Raro')).toHaveLength(2);
    expect(screen.getByText('Ano desconhecido · ★ 0,0')).toBeInTheDocument();
  });

  it('mostra o nome do streaming quando não há logo', () => {
    render(<TitleCard title={makeTitle({ streamings: [prime] })} />);
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
  });

  it('mostra aviso de indisponível apenas quando pedido', () => {
    const { rerender } = render(<TitleCard title={makeTitle()} />);
    expect(screen.queryByText('Não disponível em streaming no Brasil')).toBeNull();
    rerender(<TitleCard title={makeTitle()} showUnavailable />);
    expect(screen.getByText('Não disponível em streaming no Brasil')).toBeInTheDocument();
  });
});
