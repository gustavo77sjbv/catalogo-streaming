import Image from 'next/image';
import type { ReactNode } from 'react';
import { formatDuracao, formatNota, formatTemporadas } from '@/lib/format';
import { CATALOG_PATHS, type TitleDetails } from '@/lib/types';
import { BackLink } from './BackLink';

const votosFormatter = new Intl.NumberFormat('pt-BR');

/** Cores oficiais da classificação indicativa brasileira. */
const CLASSIFICACAO_CORES: Record<string, string> = {
  L: 'bg-green-600 text-white',
  '10': 'bg-sky-600 text-white',
  '12': 'bg-yellow-400 text-zinc-900',
  '14': 'bg-orange-500 text-white',
  '16': 'bg-red-600 text-white',
  '18': 'bg-zinc-100 text-zinc-900',
};

function classificacaoLabel(valor: string): string {
  if (valor === 'L') return 'livre para todos os públicos';
  return /^\d+$/.test(valor) ? `${valor} anos` : valor;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `secao-${title.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function TitleDetailsView({ details }: { details: TitleDetails }) {
  const linhaInfo = [
    details.ano,
    details.duracaoMin !== null ? formatDuracao(details.duracaoMin) : null,
    details.temporadas !== null ? formatTemporadas(details.temporadas, details.episodios) : null,
  ]
    .filter((item) => item !== null)
    .join(' · ');
  const nota = details.votos > 0 ? `${formatNota(details.nota)} (${votosFormatter.format(details.votos)} votos)` : 'sem nota';

  return (
    <article className="flex flex-col gap-8">
      <BackLink fallbackHref={CATALOG_PATHS[details.tipo]} />

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="relative aspect-[2/3] w-48 shrink-0 self-center overflow-hidden rounded-lg bg-zinc-800 md:w-64 md:self-start">
          {details.posterUrl ? (
            <Image
              src={details.posterUrl}
              alt={`Pôster de ${details.titulo}`}
              fill
              sizes="(max-width: 768px) 12rem, 16rem"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center p-3 text-center text-zinc-400">
              {details.titulo}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{details.titulo}</h1>
            {details.tituloOriginal && <p className="text-sm text-zinc-400">{details.tituloOriginal}</p>}
          </div>
          {linhaInfo && <p className="text-sm text-zinc-300">{linhaInfo}</p>}
          <p className="text-sm font-medium">{nota}</p>
          {details.generos.length > 0 && <p className="text-sm text-zinc-400">{details.generos.join(' · ')}</p>}
          <p className="max-w-prose leading-relaxed text-zinc-200">{details.sinopse ?? 'Sinopse não disponível.'}</p>

          <Section title="Onde assistir">
            {details.streamings.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {details.streamings.map((provider) => (
                  <li key={provider.id} title={provider.nome} className="flex items-center gap-2 rounded-full bg-zinc-800 py-1 pr-3 pl-1 text-sm">
                    {provider.logoUrl ? (
                      <Image src={provider.logoUrl} alt={provider.nome} width={28} height={28} className="rounded-full" />
                    ) : null}
                    <span aria-hidden={provider.logoUrl ? true : undefined}>{provider.nome}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-400">Não disponível em streaming no Brasil</p>
            )}
          </Section>
        </div>
      </div>

      <Section title="Classificação indicativa">
        {details.classificacao ? (
          <span
            aria-label={`Classificação indicativa: ${classificacaoLabel(details.classificacao)}`}
            className={`flex h-10 w-10 items-center justify-center rounded-md text-lg font-bold ${
              CLASSIFICACAO_CORES[details.classificacao] ?? 'bg-zinc-700 text-white'
            }`}
          >
            {details.classificacao}
          </span>
        ) : (
          // O TMDB não tem esse dado para todos os títulos (ex.: produções estrangeiras recentes).
          <div className="flex items-center gap-3">
            <span
              aria-label="Classificação indicativa: não informada para o Brasil"
              className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-700 text-lg font-bold text-zinc-300"
            >
              ?
            </span>
            <span aria-hidden="true" className="text-sm text-zinc-400">
              Classificação não informada para o Brasil
            </span>
          </div>
        )}
      </Section>

      {details.trailer && (
        <Section title="Trailer">
          <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-lg bg-zinc-900">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${details.trailer.youtubeKey}`}
              title={`Trailer: ${details.trailer.nome}`}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </Section>
      )}

      {details.direcao.length > 0 && (
        <Section title={details.tipo === 'filme' ? 'Direção' : 'Criação'}>
          <p className="text-zinc-200">{details.direcao.join(', ')}</p>
        </Section>
      )}

      {details.elenco.length > 0 && (
        <Section title="Elenco">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
            {details.elenco.map((pessoa) => (
              <li key={`${pessoa.nome}-${pessoa.personagem}`} className="flex flex-col gap-1 text-sm">
                <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-800">
                  {pessoa.fotoUrl ? (
                    <Image src={pessoa.fotoUrl} alt={pessoa.nome} fill sizes="8rem" className="object-cover" />
                  ) : null}
                </div>
                <span className="font-medium">{pessoa.nome}</span>
                {pessoa.personagem && <span className="text-xs text-zinc-400">{pessoa.personagem}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}
