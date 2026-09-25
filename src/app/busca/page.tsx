import type { Metadata } from 'next';
import { SearchResults } from '@/components/SearchResults';

export const metadata: Metadata = { title: 'Buscar títulos' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BuscaPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  return <SearchResults query={query} />;
}
