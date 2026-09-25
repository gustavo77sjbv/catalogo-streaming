export function SearchBox() {
  return (
    <form action="/busca" method="get" role="search" className="flex flex-1 gap-2 sm:max-w-md">
      <label htmlFor="busca" className="sr-only">
        Buscar filme ou série
      </label>
      <input
        id="busca"
        name="q"
        type="search"
        required
        placeholder="Buscar filme ou série…"
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm"
      />
      <button type="submit" className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900">
        Buscar
      </button>
    </form>
  );
}
