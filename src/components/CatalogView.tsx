import Link from 'next/link';
import { parseFilters, toQueryString, type RawParams } from '@/lib/filters';
import { discoverTitles } from '@/lib/tmdb/catalog';
import { listGenres } from '@/lib/tmdb/genres';
import { listStreamingProviders } from '@/lib/tmdb/providers';
import { CATALOG_PATHS, type TitleType } from '@/lib/types';
import { FilterBar } from './FilterBar';
import { FilterPendingProvider, ResultsRegion } from './FilterPendingContext';
import { LoadMore } from './LoadMore';
import { TitleGrid } from './TitleGrid';
import { TypeTabs } from './TypeTabs';

interface CatalogViewProps {
  tipo: TitleType;
  searchParams: RawParams;
}

export async function CatalogView({ tipo, searchParams }: CatalogViewProps) {
  const filters = parseFilters(searchParams);
  const [page, providers, genres] = await Promise.all([
    discoverTitles(tipo, filters, 1),
    listStreamingProviders(tipo),
    listGenres(tipo),
  ]);

  return (
    <FilterPendingProvider>
      <div className="flex flex-col gap-6">
        <TypeTabs ativo={tipo} />
        <FilterBar filters={filters} providers={providers} genres={genres} />
        {page.titles.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p>Nenhum título encontrado com esses filtros.</p>
            <Link href={CATALOG_PATHS[tipo]} className="text-sm underline">
              Limpar filtros
            </Link>
          </div>
        ) : (
          <ResultsRegion>
            <TitleGrid titles={page.titles} />
            {/* key reinicia os títulos extras quando os filtros mudam */}
            <LoadMore
              key={toQueryString(filters)}
              tipo={tipo}
              filters={filters}
              initialPage={page.page}
              totalPages={page.totalPages}
              initialKeys={page.titles.map((title) => `${title.tipo}-${title.id}`)}
            />
          </ResultsRegion>
        )}
      </div>
    </FilterPendingProvider>
  );
}
