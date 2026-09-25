import Link from 'next/link';

export function TitleNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-lg">Título não encontrado</h1>
      <p className="text-sm text-zinc-400">O link pode estar errado ou o título foi removido do TMDB.</p>
      <Link href="/filmes" className="text-sm underline">
        Voltar ao catálogo
      </Link>
    </div>
  );
}
