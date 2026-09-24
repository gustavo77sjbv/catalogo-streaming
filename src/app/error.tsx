'use client';

import { useEffect } from 'react';

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-lg">Não conseguimos carregar o catálogo.</p>
      <p className="text-sm text-zinc-400">Tente novamente em alguns instantes.</p>
      {/* `retry` (estável desde o Next 16.3.0) re-busca o segmento; `reset` só re-renderiza os filhos. */}
      <button type="button" onClick={retry} className="rounded-md bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700">
        Tentar de novo
      </button>
    </div>
  );
}
