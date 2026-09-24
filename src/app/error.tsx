'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg">Não conseguimos carregar o catálogo.</p>
      <p className="text-sm text-zinc-400">Tente novamente em alguns instantes.</p>
      <button type="button" onClick={reset} className="rounded-md bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
        Tentar de novo
      </button>
    </div>
  );
}
