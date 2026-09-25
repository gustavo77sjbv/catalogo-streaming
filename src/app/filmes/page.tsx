import type { Metadata } from 'next';
import { CatalogView } from '@/components/CatalogView';

export const metadata: Metadata = { title: 'Filmes em streaming no Brasil' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function FilmesPage({ searchParams }: PageProps) {
  return <CatalogView tipo="filme" searchParams={await searchParams} />;
}
