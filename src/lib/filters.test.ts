import { describe, expect, it } from 'vitest';
import {
  filtersHref,
  parseFilters,
  parsePage,
  parseTitleId,
  parseTitleType,
  serializeFilters,
  toQueryString,
} from './filters';
import { DEFAULT_FILTERS, type Filters } from './types';

const completo: Filters = {
  streamings: [8, 119],
  generos: [35],
  anoDe: 2010,
  anoAte: 2024,
  notaMin: 7,
  ordem: 'nota',
};

describe('parseFilters', () => {
  it('retorna os padrões quando não há parâmetros', () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros de URLSearchParams', () => {
    const params = new URLSearchParams('streaming=8,119&genero=35&anoDe=2010&anoAte=2024&notaMin=7&ordem=nota');
    expect(parseFilters(params)).toEqual(completo);
  });

  it('aceita o objeto searchParams do Next e usa o primeiro valor de listas', () => {
    expect(parseFilters({ genero: ['35', '18'], ordem: 'lancamento' })).toMatchObject({
      generos: [35],
      ordem: 'lancamento',
    });
  });

  it('ignora valores inválidos e usa o padrão', () => {
    const filters = parseFilters({
      streaming: 'abc,8,-1,2.5,',
      genero: '',
      anoDe: '19',
      anoAte: 'xyz',
      notaMin: '11',
      ordem: 'aleatoria',
    });
    expect(filters).toEqual({ ...DEFAULT_FILTERS, streamings: [8] });
  });

  it('remove IDs repetidos', () => {
    expect(parseFilters({ streaming: '8,8,119' }).streamings).toEqual([8, 119]);
  });

  it('troca anoDe e anoAte quando estão invertidos', () => {
    expect(parseFilters({ anoDe: '2024', anoAte: '2010' })).toMatchObject({ anoDe: 2010, anoAte: 2024 });
  });

  it('aceita nota decimal', () => {
    expect(parseFilters({ notaMin: '7.5' }).notaMin).toBe(7.5);
  });
});

describe('serializeFilters / toQueryString / filtersHref', () => {
  it('não gera parâmetros para os padrões', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('serializa todos os filtros na ordem fixa', () => {
    expect(toQueryString(completo)).toBe('streaming=8,119&genero=35&anoDe=2010&anoAte=2024&notaMin=7&ordem=nota');
  });

  it('ida e volta preserva os filtros', () => {
    expect(parseFilters(serializeFilters(completo))).toEqual(completo);
  });

  it('monta o href sem "?" quando não há filtros', () => {
    expect(filtersHref('/filmes', DEFAULT_FILTERS)).toBe('/filmes');
    expect(filtersHref('/filmes', { ...DEFAULT_FILTERS, streamings: [8, 119] })).toBe('/filmes?streaming=8,119');
  });
});

describe('parsePage', () => {
  it.each([
    [null, 1],
    [undefined, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['3', 3],
    ['9999', 500],
  ])('parsePage(%s) = %s', (raw, esperado) => {
    expect(parsePage(raw)).toBe(esperado);
  });
});

describe('parseTitleId', () => {
  it('aceita apenas inteiros positivos', () => {
    expect(parseTitleId('438631')).toBe(438631);
    expect(parseTitleId('0')).toBeNull();
    expect(parseTitleId('-5')).toBeNull();
    expect(parseTitleId('12abc')).toBeNull();
    expect(parseTitleId('1.5')).toBeNull();
    expect(parseTitleId('')).toBeNull();
  });
});

describe('parseTitleType', () => {
  it('aceita apenas filme e serie', () => {
    expect(parseTitleType('filme')).toBe('filme');
    expect(parseTitleType('serie')).toBe('serie');
    expect(parseTitleType('movie')).toBeNull();
    expect(parseTitleType(null)).toBeNull();
  });
});
