'use client';

import { useState } from 'react';
import { serializeFilters } from '@/lib/filters';
import type { Filters, Title, TitlePage, TitleType } from '@/lib/types';
import { TitleGrid } from './TitleGrid';

type Status = 'idle' | 'loading' | 'error';

interface LoadMoreProps {
  tipo: TitleType;
  filters: Filters;
  initialPage: number;
  totalPages: number;
}

export function LoadMore({ tipo, filters, initialPage, totalPages }: LoadMoreProps) {
  const [titles, setTitles] = useState<Title[]>([]);
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<Status>('idle');

  async function loadNext() {
    setStatus('loading');
    const params = serializeFilters(filters);
    params.set('tipo', tipo);
    params.set('page', String(page + 1));
    try {
      const response = await fetch(`/api/titles?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as TitlePage;
      setTitles((previous) => [
        ...previous,
        ...data.titles.filter((title) => !previous.some((p) => p.id === title.id && p.tipo === title.tipo)),
      ]);
      setPage(data.page);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  const hasMore = page < totalPages;

  return (
    <>
      {titles.length > 0 && <TitleGrid titles={titles} />}
      {hasMore && (
        <div className="flex flex-col items-center gap-2 py-6">
          {status === 'error' && (
            <p role="alert" className="text-sm text-red-400">
              Não foi possível carregar mais títulos.
            </p>
          )}
          <button
            type="button"
            onClick={loadNext}
            disabled={status === 'loading'}
            className="rounded-md bg-zinc-800 px-6 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
          >
            {status === 'loading' ? 'Carregando…' : status === 'error' ? 'Tentar de novo' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
}
