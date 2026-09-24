'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Provider } from '@/lib/types';

export const VISIBLE_PROVIDERS = 10;

interface ProviderChipsProps {
  providers: Provider[];
  selected: number[];
  onToggle: (id: number) => void;
}

export function ProviderChips({ providers, selected, onToggle }: ProviderChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? providers
    : providers.filter((provider, index) => index < VISIBLE_PROVIDERS || selected.includes(provider.id));
  const hiddenCount = providers.length - visible.length;
  const showToggle = expanded ? providers.length > VISIBLE_PROVIDERS : hiddenCount > 0;

  return (
    <div role="group" aria-label="Streamings" className="flex flex-wrap items-center gap-2">
      {visible.map((provider) => {
        const active = selected.includes(provider.id);
        return (
          <button
            key={provider.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(provider.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              active ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            {provider.logoUrl && (
              <Image src={provider.logoUrl} alt="" width={20} height={20} className="rounded" />
            )}
            <span>{provider.nome}</span>
          </button>
        );
      })}
      {showToggle && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="text-sm text-zinc-400 underline">
          {expanded ? 'Ver menos' : `Ver mais (${hiddenCount})`}
        </button>
      )}
    </div>
  );
}
