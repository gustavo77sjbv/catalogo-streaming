// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TitleDetails } from '@/lib/types';
import { netflix } from '../../test/fixtures';
import { TitleDetailsView } from './TitleDetailsView';

vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

function makeDetails(overrides: Partial<TitleDetails> = {}): TitleDetails {
  return {
    id: 1,
    tipo: 'filme',
    titulo: 'Duna',
    tituloOriginal: 'Dune',
    ano: 2021,
    nota: 7.8,
    votos: 12345,
    posterUrl: 'https://image.tmdb.org/t/p/w500/duna.jpg',
    generos: ['Ficção científica', 'Aventura'],
    duracaoMin: 155,
    temporadas: null,
    episodios: null,
    sinopse: 'Paul Atreides viaja para Arrakis.',
    classificacao: '14',
    trailer: { youtubeKey: 'pt1', nome: 'Trailer Dublado' },
    direcao: ['Denis Villeneuve'],
    elenco: [
      { nome: 'Timothée Chalamet', personagem: 'Paul Atreides', fotoUrl: 'https://image.tmdb.org/t/p/w185/tc.jpg' },
      { nome: 'Zendaya', personagem: 'Chani', fotoUrl: null },
    ],
    streamings: [netflix],
    ...overrides,
  };
}

describe('TitleDetailsView', () => {
  it('mostra a base: título, original, ano, nota com votos, gêneros, duração, sinopse e onde assistir', () => {
    render(<TitleDetailsView details={makeDetails()} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByText('Dune')).toBeInTheDocument();
    expect(screen.getByText('2021 · 2h 35min')).toBeInTheDocument();
    expect(screen.getByText('★ 7,8 (12.345 votos)')).toBeInTheDocument();
    expect(screen.getByText('Ficção científica · Aventura')).toBeInTheDocument();
    expect(screen.getByText('Paul Atreides viaja para Arrakis.')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pôster de Duna' })).toBeInTheDocument();
    const ondeAssistir = screen.getByRole('region', { name: 'Onde assistir' });
    expect(within(ondeAssistir).getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
  });

  it('mostra as seções extras na ordem: classificação, trailer, direção, elenco', () => {
    render(<TitleDetailsView details={makeDetails()} />);
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Onde assistir', 'Classificação indicativa', 'Trailer', 'Direção', 'Elenco']);
    expect(screen.getByLabelText('Classificação indicativa: 14 anos')).toHaveTextContent('14');
    expect(screen.getByTitle('Trailer: Trailer Dublado')).toHaveAttribute(
      'src',
      'https://www.youtube-nocookie.com/embed/pt1',
    );
    expect(screen.getByText('Denis Villeneuve')).toBeInTheDocument();
    const elenco = screen.getByRole('region', { name: 'Elenco' });
    expect(within(elenco).getByText('Timothée Chalamet')).toBeInTheDocument();
    expect(within(elenco).getByText('Paul Atreides')).toBeInTheDocument();
    expect(within(elenco).getByRole('img', { name: 'Timothée Chalamet' })).toBeInTheDocument();
  });

  it('usa "Criação" e temporadas para séries, e "Livre" para classificação L', () => {
    render(
      <TitleDetailsView
        details={makeDetails({
          tipo: 'serie',
          duracaoMin: null,
          temporadas: 3,
          episodios: 26,
          classificacao: 'L',
          direcao: ['Baran bo Odar'],
        })}
      />,
    );
    expect(screen.getByText('2021 · 3 temporadas · 26 episódios')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Criação' })).toBeInTheDocument();
    expect(screen.getByLabelText('Classificação indicativa: livre para todos os públicos')).toHaveTextContent('L');
  });

  it('lida com dados ausentes sem quebrar', () => {
    render(
      <TitleDetailsView
        details={makeDetails({
          tituloOriginal: null,
          ano: null,
          nota: 0,
          votos: 0,
          posterUrl: null,
          generos: [],
          duracaoMin: null,
          sinopse: null,
          classificacao: null,
          trailer: null,
          direcao: [],
          elenco: [],
          streamings: [],
        })}
      />,
    );
    expect(screen.getByText('sem nota')).toBeInTheDocument();
    expect(screen.getByText('Sinopse não disponível.')).toBeInTheDocument();
    expect(screen.getByText('Não disponível em streaming no Brasil')).toBeInTheDocument();
    const titulos = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titulos).toEqual(['Onde assistir', 'Classificação indicativa']);
    expect(screen.getByLabelText('Classificação indicativa: não informada para o Brasil')).toHaveTextContent('?');
    expect(screen.getByText('Classificação não informada para o Brasil')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Pôster/ })).toBeNull();
  });

  it('tem link de voltar para o catálogo', () => {
    render(<TitleDetailsView details={makeDetails({ tipo: 'serie' })} />);
    expect(screen.getByRole('link', { name: '← Voltar' })).toHaveAttribute('href', '/series');
  });
});
