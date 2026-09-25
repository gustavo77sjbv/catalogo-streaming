import type { Metadata } from 'next';
import { CatalogView } from '@/components/CatalogView';

export const metadata: Metadata = { title: 'Séries em streaming no Brasil' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SeriesPage({ searchParams }: PageProps) {
  return <CatalogView tipo="serie" searchParams={await searchParams} />;
}
