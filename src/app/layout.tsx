import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { SearchBox } from '@/components/SearchBox';
import './globals.css';

export const metadata: Metadata = {
  title: 'Catálogo de Streaming',
  description: 'Filmes e séries disponíveis agora nos streamings de assinatura no Brasil.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased">
        <header className="border-b border-zinc-800">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
            <Link href="/filmes" className="text-lg font-bold">
              Catálogo de Streaming
            </Link>
            <SearchBox />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
