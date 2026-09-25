import Link from 'next/link';
import { CATALOG_PATHS, type TitleType } from '@/lib/types';

const TABS: { tipo: TitleType; label: string }[] = [
  { tipo: 'filme', label: 'Filmes' },
  { tipo: 'serie', label: 'Séries' },
];

// Os links não levam os filtros: os IDs de gênero de filmes e séries são diferentes no TMDB.
export function TypeTabs({ ativo }: { ativo: TitleType }) {
  return (
    <nav aria-label="Tipo de título">
      <ul className="flex gap-2">
        {TABS.map((tab) => {
          const active = tab.tipo === ativo;
          return (
            <li key={tab.tipo}>
              <Link
                href={CATALOG_PATHS[tab.tipo]}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
