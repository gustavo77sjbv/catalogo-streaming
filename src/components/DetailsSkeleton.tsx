export function DetailsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6 md:flex-row">
      <span className="sr-only">Carregando…</span>
      <div className="aspect-[2/3] w-48 shrink-0 animate-pulse self-center rounded-lg bg-zinc-800 md:w-64 md:self-start" />
      <div className="flex flex-1 flex-col gap-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-800" />
        <div className="h-24 w-full max-w-prose animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}
