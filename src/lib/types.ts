export type TitleType = 'filme' | 'serie';

export type SortOrder = 'popularidade' | 'nota' | 'lancamento';

export interface Provider {
  id: number;
  nome: string;
  logoUrl: string | null;
}

export interface Genre {
  id: number;
  nome: string;
}

export interface Title {
  id: number;
  tipo: TitleType;
  titulo: string;
  ano: number | null;
  /** vote_average do TMDB, 0–10, uma casa decimal */
  nota: number;
  posterUrl: string | null;
  /** apenas streamings de assinatura (flatrate) no Brasil */
  streamings: Provider[];
}

export interface CastMember {
  nome: string;
  personagem: string | null;
  fotoUrl: string | null;
}

export interface Trailer {
  youtubeKey: string;
  nome: string;
}

export interface TitleDetails {
  id: number;
  tipo: TitleType;
  titulo: string;
  /** null quando é igual ao título em português */
  tituloOriginal: string | null;
  ano: number | null;
  /** vote_average do TMDB, 0–10, uma casa decimal */
  nota: number;
  votos: number;
  posterUrl: string | null;
  generos: string[];
  /** só filmes */
  duracaoMin: number | null;
  /** só séries */
  temporadas: number | null;
  episodios: number | null;
  sinopse: string | null;
  /** classificação indicativa do Brasil (L, 10, 12, 14, 16, 18) */
  classificacao: string | null;
  trailer: Trailer | null;
  /** diretores (filmes) ou criadores (séries) */
  direcao: string[];
  elenco: CastMember[];
  streamings: Provider[];
}

export interface Filters {
  streamings: number[];
  generos: number[];
  anoDe: number | null;
  anoAte: number | null;
  notaMin: number | null;
  ordem: SortOrder;
}

export interface TitlePage {
  titles: Title[];
  page: number;
  totalPages: number;
}

export const DEFAULT_FILTERS: Filters = {
  streamings: [],
  generos: [],
  anoDe: null,
  anoAte: null,
  notaMin: null,
  ordem: 'popularidade',
};

/** O TMDB não aceita page > 500 no discover. */
export const MAX_TMDB_PAGE = 500;

export const CATALOG_PATHS: Record<TitleType, string> = {
  filme: '/filmes',
  serie: '/series',
};
