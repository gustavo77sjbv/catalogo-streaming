import Image from 'next/image';
import Link from 'next/link';
import { formatNota } from '@/lib/format';
import { CATALOG_PATHS, type Title } from '@/lib/types';

interface TitleCardProps {
  title: Title;
  showUnavailable?: boolean;
}

export function TitleCard({ title, showUnavailable = false }: TitleCardProps) {
  return (
    <Link
      href={`${CATALOG_PATHS[title.tipo]}/${title.id}`}
      aria-label={`Ver detalhes de ${title.titulo}`}
      className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-100"
    >
      <article aria-label={title.titulo} className="flex flex-col gap-2">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 transition group-hover:ring-2 group-hover:ring-zinc-400">
          {title.posterUrl ? (
            <Image
              src={title.posterUrl}
              alt={`Pôster de ${title.titulo}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-sm text-zinc-400">
              {title.titulo}
            </div>
          )}
        </div>
        <div>
          <h3 className="line-clamp-2 text-sm font-semibold">{title.titulo}</h3>
          <p className="text-xs text-zinc-400">
            {title.ano ?? 'Ano desconhecido'} · {formatNota(title.nota)}
          </p>
        </div>
        {title.streamings.length > 0 ? (
          <ul aria-label="Disponível em" className="flex flex-wrap gap-1">
            {title.streamings.map((provider) => (
              <li key={provider.id} title={provider.nome}>
                {provider.logoUrl ? (
                  <Image src={provider.logoUrl} alt={provider.nome} width={24} height={24} className="rounded" />
                ) : (
                  <span className="rounded bg-zinc-700 px-1 text-[10px]">{provider.nome}</span>
                )}
              </li>
            ))}
          </ul>
        ) : showUnavailable ? (
          <p className="text-xs text-zinc-500">Não disponível em streaming no Brasil</p>
        ) : null}
      </article>
    </Link>
  );
}
