import { describe, expect, it } from 'vitest';
import { formatDuracao, formatNota, formatTemporadas } from './format';

describe('formatNota', () => {
  it('mostra a nota com uma casa decimal em pt-BR', () => {
    expect(formatNota(7.8)).toBe('★ 7,8');
    expect(formatNota(8)).toBe('★ 8,0');
  });

  it('mostra "sem nota" quando não há votos', () => {
    expect(formatNota(0)).toBe('sem nota');
  });
});

describe('formatDuracao', () => {
  it.each([
    [155, '2h 35min'],
    [120, '2h'],
    [45, '45min'],
  ])('%s minutos = %s', (minutos, esperado) => {
    expect(formatDuracao(minutos)).toBe(esperado);
  });
});

describe('formatTemporadas', () => {
  it('usa singular e plural', () => {
    expect(formatTemporadas(1, 8)).toBe('1 temporada · 8 episódios');
    expect(formatTemporadas(3, 1)).toBe('3 temporadas · 1 episódio');
  });

  it('omite episódios quando não informados', () => {
    expect(formatTemporadas(2, null)).toBe('2 temporadas');
  });
});
