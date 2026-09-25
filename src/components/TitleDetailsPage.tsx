import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { parseTitleId } from '@/lib/filters';
import { getTitleDetails } from '@/lib/tmdb/details';
import type { TitleType } from '@/lib/types';
import { TitleDetailsView } from './TitleDetailsView';

/** Página de detalhes compartilhada por /filmes/[id] e /series/[id]. */
export async function TitleDetailsPage({ tipo, rawId }: { tipo: TitleType; rawId: string }) {
  const id = parseTitleId(rawId);
  if (id === null) notFound();
  const details = await getTitleDetails(tipo, id);
  if (!details) notFound();
  return <TitleDetailsView details={details} />;
}

export async function titleDetailsMetadata(tipo: TitleType, rawId: string): Promise<Metadata> {
  const id = parseTitleId(rawId);
  // O fetch é deduplicado pelo Next: a página reaproveita esta mesma resposta.
  const details = id === null ? null : await getTitleDetails(tipo, id);
  if (!details) return { title: 'Título não encontrado' };
  return {
    title: details.ano ? `${details.titulo} (${details.ano})` : details.titulo,
    description: details.sinopse ?? undefined,
  };
}
