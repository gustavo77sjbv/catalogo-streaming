import Image from 'next/image';

export function Footer() {
  return (
    <footer className="border-t border-zinc-800">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer">
          <Image src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" width={120} height={16} unoptimized />
        </a>
        <p>Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.</p>
        <p>
          Dados de streaming fornecidos por{' '}
          <a href="https://www.justwatch.com" target="_blank" rel="noreferrer" className="underline">
            JustWatch
          </a>
          .
        </p>
      </div>
    </footer>
  );
}
