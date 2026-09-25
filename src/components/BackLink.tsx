'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

/**
 * Volta para a página anterior quando ela é deste site (preserva filtros e "Carregar mais");
 * quando a pessoa chegou por um link direto, segue o `href` normalmente.
 */
export function BackLink({ fallbackHref }: { fallbackHref: string }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (document.referrer.startsWith(window.location.origin)) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <a href={fallbackHref} onClick={handleClick} className="text-sm text-zinc-400 hover:text-zinc-100">
      ← Voltar
    </a>
  );
}
