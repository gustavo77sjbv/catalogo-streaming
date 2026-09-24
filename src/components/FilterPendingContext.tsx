'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface FilterPendingValue {
  pending: boolean;
  setPending: (value: boolean) => void;
}

const FilterPendingContext = createContext<FilterPendingValue>({ pending: false, setPending: () => {} });

/** Compartilha o estado "pendente" da navegação da FilterBar com a área de resultados. */
export function FilterPendingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  return <FilterPendingContext.Provider value={{ pending, setPending }}>{children}</FilterPendingContext.Provider>;
}

export function useFilterPending(): FilterPendingValue {
  return useContext(FilterPendingContext);
}

/** Envolve a área de resultados: esmaece e marca aria-busy enquanto os filtros aplicam. */
export function ResultsRegion({ children }: { children: ReactNode }) {
  const { pending } = useFilterPending();
  return (
    <div aria-busy={pending} className={`transition-opacity ${pending ? 'opacity-50' : ''}`}>
      {children}
    </div>
  );
}
