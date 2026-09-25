import { searchTitles } from '@/lib/tmdb/search';
import { TitleGrid } from './TitleGrid';

export async function SearchResults({ query }: { query: string }) {
  if (!query) {
    return <p className="py-16 text-center text-zinc-400">Digite o nome de um filme ou série para buscar.</p>;
  }

  const titles = await searchTitles(query);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Resultados para “{query}”</h1>
      {titles.length === 0 ? (
        <p className="py-16 text-center text-zinc-400">Nenhum título encontrado para “{query}”.</p>
      ) : (
        <TitleGrid titles={titles} showUnavailable />
      )}
    </div>
  );
}
