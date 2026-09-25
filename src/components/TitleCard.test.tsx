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

  it('usa placeholder sem pôster, "Ano desconhecido" sem data e "sem nota" sem votos', () => {
    render(<TitleCard title={makeTitle({ titulo: 'Raro', ano: null, nota: 0, posterUrl: null })} />);
    expect(screen.queryByRole('img', { name: /Pôster/ })).toBeNull();
    expect(screen.getAllByText('Raro')).toHaveLength(2);
    expect(screen.getByText('Ano desconhecido · sem nota')).toBeInTheDocument();
  });

  it('leva para a página de detalhes do filme ou da série', () => {
    const { rerender } = render(<TitleCard title={makeTitle({ id: 42, tipo: 'filme', titulo: 'Duna' })} />);
    expect(screen.getByRole('link', { name: 'Ver detalhes de Duna' })).toHaveAttribute('href', '/filmes/42');
    rerender(<TitleCard title={makeTitle({ id: 7, tipo: 'serie', titulo: 'Dark' })} />);
    expect(screen.getByRole('link', { name: 'Ver detalhes de Dark' })).toHaveAttribute('href', '/series/7');
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
