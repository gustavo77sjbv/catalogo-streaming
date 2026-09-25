'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import { filtersHref, parseFilters } from '@/lib/filters';
import { DEFAULT_FILTERS, type Filters, type Genre, type Provider, type SortOrder } from '@/lib/types';
import { useFilterPending } from './FilterPendingContext';
import { ProviderChips } from './ProviderChips';

const ORDENS: { value: SortOrder; label: string }[] = [
  { value: 'popularidade', label: 'Popularidade' },
  { value: 'nota', label: 'Nota' },
  { value: 'lancamento', label: 'Lançamento mais recente' },
];

const NOTAS = [5, 6, 7, 8, 9];

const fieldClass = 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm';

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

interface FilterBarProps {
  filters: Filters;
  providers: Provider[];
  genres: Genre[];
}

export function FilterBar({ filters, providers, genres }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  // `filters` vem do server e só se atualiza quando a navegação termina; enquanto isso, os
  // cliques seguintes precisam se basear no último valor aplicado localmente, não na prop
  // (que fica parada até lá). Usamos useState (em vez de useOptimistic) porque o `router.push`
  // do Next não retorna uma Promise: dentro de um `startTransition` síncrono e sem navegação
  // real (como nos testes, com `push` mockado), useOptimistic reverteria para a prop antes
  // mesmo do clique terminar. useState dá o feedback imediato sem depender disso, e o efeito
  // abaixo resincroniza com o servidor quando a navegação de fato chega.
  const [appliedFilters, setAppliedFilters] = useState(filters);
  // Ajuste de estado durante a renderização (em vez de um efeito) ao receber uma prop `filters`
  // nova: evita o "cascading render" de chamar setState dentro de um efeito.
  const [syncedFilters, setSyncedFilters] = useState(filters);
  if (filters !== syncedFilters) {
    setSyncedFilters(filters);
    setAppliedFilters(filters);
  }
  const { setPending } = useFilterPending();

  useEffect(() => {
    setPending(isPending);
  }, [isPending, setPending]);

  function apply(next: Filters) {
    setAppliedFilters(next);
    startTransition(() => {
      router.push(filtersHref(pathname, next));
    });
  }

  function handleYears(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // parseFilters valida os anos e corrige a ordem invertida.
    const { anoDe, anoAte } = parseFilters(
      new URLSearchParams({ anoDe: String(data.get('anoDe') ?? ''), anoAte: String(data.get('anoAte') ?? '') }),
    );
    apply({ ...appliedFilters, anoDe, anoAte });
  }

  return (
    <section aria-label="Filtros" className="flex flex-col gap-4">
      <ProviderChips
        providers={providers}
        selected={appliedFilters.streamings}
        onToggle={(id) => apply({ ...appliedFilters, streamings: toggle(appliedFilters.streamings, id) })}
      />

      <div role="group" aria-label="Gêneros" className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const active = appliedFilters.generos.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ ...appliedFilters, generos: toggle(appliedFilters.generos, genre.id) })}
              className={`rounded-full px-3 py-1 text-xs ${
                active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {genre.nome}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form
          key={`${appliedFilters.anoDe}-${appliedFilters.anoAte}`}
          onSubmit={handleYears}
          className="flex items-end gap-2"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-ano-de" className="text-xs text-zinc-400">
              Ano de
            </label>
            <input
              id="filtro-ano-de"
              name="anoDe"
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              defaultValue={appliedFilters.anoDe ?? ''}
              className={`${fieldClass} w-24`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-ano-ate" className="text-xs text-zinc-400">
              Ano até
            </label>
            <input
              id="filtro-ano-ate"
              name="anoAte"
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              defaultValue={appliedFilters.anoAte ?? ''}
              className={`${fieldClass} w-24`}
            />
          </div>
          <button type="submit" className="rounded-md bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700">
            Aplicar
          </button>
        </form>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-nota" className="text-xs text-zinc-400">
            Nota mínima
          </label>
          <select
            id="filtro-nota"
            value={appliedFilters.notaMin ?? ''}
            onChange={(event) =>
              apply({
                ...appliedFilters,
                notaMin: event.target.value === '' ? null : Number(event.target.value),
              })
            }
            className={fieldClass}
          >
            <option value="">Qualquer</option>
            {NOTAS.map((nota) => (
              <option key={nota} value={nota}>
                {nota}+
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ordem" className="text-xs text-zinc-400">
            Ordenar por
          </label>
          <select
            id="filtro-ordem"
            value={appliedFilters.ordem}
            onChange={(event) => apply({ ...appliedFilters, ordem: event.target.value as SortOrder })}
            className={fieldClass}
          >
            {ORDENS.map((ordem) => (
              <option key={ordem.value} value={ordem.value}>
                {ordem.label}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => apply(DEFAULT_FILTERS)} className="text-sm text-zinc-400 underline">
          Limpar filtros
        </button>
      </div>
    </section>
  );
}
