const notaFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Nota do TMDB (0–10); 0 significa que o título ainda não tem votos. */
export function formatNota(nota: number): string {
  return nota > 0 ? `★ ${notaFormatter.format(nota)}` : 'sem nota';
}

export function formatDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto}min`;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
}

export function formatTemporadas(temporadas: number, episodios: number | null): string {
  const t = `${temporadas} ${temporadas === 1 ? 'temporada' : 'temporadas'}`;
  if (episodios === null) return t;
  return `${t} · ${episodios} ${episodios === 1 ? 'episódio' : 'episódios'}`;
}
