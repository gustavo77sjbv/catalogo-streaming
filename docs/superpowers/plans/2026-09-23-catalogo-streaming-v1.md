# Catálogo de Streaming v1 — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web app Next.js que lista filmes e séries disponíveis agora nos streamings de assinatura no Brasil, com filtros, "carregar mais" e busca, usando a API do TMDB.

**Architecture:** Páginas são Server Components que leem os filtros da URL, chamam o módulo `src/lib/tmdb/` (único ponto de contato com o TMDB, com cache via `fetch` do Next) e renderizam a grade. Componentes cliente só alteram a URL (`FilterBar`) ou buscam páginas extras via Route Handler `/api/titles` (`LoadMore`). Tipos internos (`Title`, `Filters`...) isolam o resto do app do JSON do TMDB.

**Tech Stack:** Next.js (App Router, versão `latest`) · React · TypeScript strict · Tailwind CSS · Zod · Vitest + MSW + React Testing Library · Playwright · ESLint + Prettier.

**Spec:** `docs/superpowers/specs/2026-09-23-catalogo-streaming-design.md`

## Global Constraints

- Toda chamada ao TMDB envia `language=pt-BR`; catálogo usa `watch_region=BR` e `with_watch_monetization_types=flatrate`.
- `TMDB_READ_TOKEN` é usado só no servidor, como `Authorization: Bearer <token>`. Todo arquivo em `src/lib/tmdb/` que faz rede começa com `import 'server-only';`.
- Somente `src/lib/tmdb/` conversa com o TMDB. Componentes e páginas recebem apenas os tipos de `src/lib/types.ts`.
- Parâmetros de URL (nomes exatos): `streaming`, `genero` (IDs separados por vírgula), `anoDe`, `anoAte`, `notaMin`, `ordem` (`popularidade` | `nota` | `lancamento`; padrão `popularidade`).
- Regra OU para streamings e gêneros (`|` na chamada ao TMDB).
- Cache (`next.revalidate`): gêneros e lista de streamings 7 dias; discover 6 horas; streamings de um título 24 horas; busca 1 hora.
- Páginas do TMDB: 20 itens; página máxima aceita 500.
- Rotas: `/` → redirect `/filmes`; `/filmes`; `/series`; `/busca?q=`; `/api/titles`.
- Textos de interface em português do Brasil. Rodapé com logo do TMDB, aviso "Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB." e crédito à JustWatch.
- Nenhum teste chama a API real do TMDB.
- TypeScript `strict`. No App Router atual, `searchParams` de página é uma `Promise` e deve ser aguardado.
- **Ajustes em relação ao spec (decididos neste plano):** (1) `Provider.logoUrl` é `string | null` (alguns providers não têm logo; o card mostra o nome no lugar). (2) `next.config` usa `images.unoptimized: true` em vez de `remotePatterns` — o CDN do TMDB já entrega tamanhos prontos (`w342`, `w92`) e a otimização da Vercel no plano gratuito esgotaria a cota com centenas de pôsteres.

## Review Focus

1. **Título sem data, sem pôster ou provider sem logo** → card mostra "Ano desconhecido", placeholder com o título e o nome do streaming em texto, sem quebrar. (Testes: Task 3 `mappers.test.ts`, Task 6 `TitleCard.test.tsx`.)
2. **Busca com espaços, acentos ou `&`** (`"  Amélie & cia "`) → texto é aparado e enviado corretamente codificado; só espaços não chama a API. (Testes: Task 4 `search.test.ts`.)
3. **Página inválida ou além do limite** (`page=abc`, `page=9999`) → cai para 1 ou 500, nunca erro; "Carregar mais" some na última página. (Testes: Task 1 `filters.test.ts`, Task 3 `catalog.test.ts`, Task 8 `LoadMore.test.tsx`.)
4. **Falha ao buscar streamings de um único título** → aquele card aparece sem logos, os outros normais. (Teste: Task 3 `providers.test.ts`.)
5. **Streaming selecionado fora dos 10 primeiros chips** (ex.: link compartilhado) → continua visível e marcado mesmo com a lista recolhida. (Teste: Task 7 `ProviderChips.test.tsx`.)

---

## Estrutura de arquivos

```
.env.example                       variável TMDB_READ_TOKEN documentada
.prettierrc
next.config.ts                     images.unoptimized
vitest.config.ts
playwright.config.ts
README.md
public/tmdb-logo.svg
test/
  setup.ts                         jest-dom, cleanup, mocks de next/image e next/link, token de teste
  server-only-stub.ts              substitui 'server-only' nos testes
  msw.ts                           servidor MSW + useMsw() + constante TMDB
  fixtures.ts                      makeTitle(), netflix, prime
e2e/
  mock-tmdb.mjs                    servidor HTTP falso do TMDB para o Playwright
  catalogo.spec.ts
  busca.spec.ts
src/
  lib/
    types.ts                       tipos internos + constantes
    filters.ts                     URL ⇄ Filters, parsePage, parseTitleType, toQueryString, filtersHref
    tmdb/
      schemas.ts                   schemas Zod das respostas do TMDB
      client.ts                    tmdbFetch, TmdbError, REGION, REVALIDATE
      mappers.ts                   TMDB → Title/Provider, mediaPath, yearFrom
      providers.ts                 listStreamingProviders, getTitleProviders, attachProviders
      genres.ts                    listGenres
      catalog.ts                   buildDiscoverParams, discoverTitles
      search.ts                    searchTitles
  components/
    TitleCard.tsx, TitleGrid.tsx, TypeTabs.tsx
    ProviderChips.tsx, FilterBar.tsx
    LoadMore.tsx
    CatalogView.tsx, SearchResults.tsx
    SearchBox.tsx, Footer.tsx, GridSkeleton.tsx
  app/
    layout.tsx, globals.css, page.tsx, error.tsx
    filmes/page.tsx, filmes/loading.tsx
    series/page.tsx, series/loading.tsx
    busca/page.tsx, busca/loading.tsx
    api/titles/route.ts
```

---

### Task 1: Projeto base e filtros de URL

**Files:**
- Create (scaffold): projeto Next.js na raiz
- Create: `vitest.config.ts`, `test/setup.ts`, `test/server-only-stub.ts`, `test/msw.ts`, `.env.example`, `.prettierrc`
- Modify: `.gitignore`, `package.json` (scripts)
- Create: `src/lib/types.ts`, `src/lib/filters.ts`
- Test: `src/lib/filters.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `types.ts`: `TitleType = 'filme' | 'serie'`, `SortOrder = 'popularidade' | 'nota' | 'lancamento'`, `Provider { id: number; nome: string; logoUrl: string | null }`, `Genre { id: number; nome: string }`, `Title { id; tipo: TitleType; titulo: string; ano: number | null; nota: number; posterUrl: string | null; streamings: Provider[] }`, `Filters { streamings: number[]; generos: number[]; anoDe: number | null; anoAte: number | null; notaMin: number | null; ordem: SortOrder }`, `TitlePage { titles: Title[]; page: number; totalPages: number }`, `DEFAULT_FILTERS: Filters`, `MAX_TMDB_PAGE = 500`, `CATALOG_PATHS: Record<TitleType, string>`.
  - `filters.ts`: `type RawParams = URLSearchParams | Record<string, string | string[] | undefined>`, `parseFilters(params: RawParams): Filters`, `serializeFilters(filters: Filters): URLSearchParams`, `toQueryString(filters: Filters): string` (vírgulas legíveis), `filtersHref(pathname: string, filters: Filters): string`, `parseTitleType(raw: string | null | undefined): TitleType | null`, `parsePage(raw: string | null | undefined): number`.
  - `test/msw.ts`: `server`, `useMsw()`, `TMDB = 'https://api.themoviedb.org/3'`.

- [ ] **Step 1: Criar o projeto Next.js na pasta atual**

A pasta já contém `docs/` e `.git/`, que o create-next-app aceita.

Run:
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: termina com "Success! Created ..." e `npm run dev` passa a existir em `package.json`.

- [ ] **Step 2: Instalar dependências**

Run:
```bash
npm install zod server-only
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event msw @playwright/test prettier
```
Expected: instalação sem erros.

- [ ] **Step 3: Adicionar scripts**

Run:
```bash
npm pkg set scripts.test="vitest run" scripts.test:watch="vitest" scripts.test:e2e="playwright test" scripts.typecheck="tsc --noEmit" scripts.format="prettier --write ."
```

- [ ] **Step 4: Configurar Vitest e utilitários de teste**

`vitest.config.ts`:
```ts
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./test/server-only-stub.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

`test/server-only-stub.ts`:
```ts
// Nos testes, 'server-only' não deve lançar erro.
export {};
```

`test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

process.env.TMDB_READ_TOKEN = 'test-token';
delete process.env.TMDB_API_BASE_URL;

afterEach(() => {
  cleanup();
});

vi.mock('next/image', async () => {
  const { createElement } = await import('react');
  return {
    default: (props: { src: string; alt: string; width?: number; height?: number; className?: string }) =>
      createElement('img', {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        className: props.className,
      }),
  };
});

vi.mock('next/link', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode } & Record<string, unknown>) =>
      createElement('a', { href, ...rest }, children),
  };
});
```

`test/msw.ts`:
```ts
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const TMDB = 'https://api.themoviedb.org/3';

export const server = setupServer();

export function useMsw() {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
```

- [ ] **Step 5: Arquivos de ambiente e formatação**

`.env.example`:
```bash
# Token de leitura (API Read Access Token, v4) em https://www.themoviedb.org/settings/api
TMDB_READ_TOKEN=
```

`.prettierrc`:
```json
{ "singleQuote": true, "printWidth": 110 }
```

Acrescentar ao final de `.gitignore`:
```
!.env.example
/test-results
/playwright-report
```

- [ ] **Step 6: Escrever `src/lib/types.ts`**

```ts
export type TitleType = 'filme' | 'serie';

export type SortOrder = 'popularidade' | 'nota' | 'lancamento';

export interface Provider {
  id: number;
  nome: string;
  logoUrl: string | null;
}

export interface Genre {
  id: number;
  nome: string;
}

export interface Title {
  id: number;
  tipo: TitleType;
  titulo: string;
  ano: number | null;
  /** vote_average do TMDB, 0–10, uma casa decimal */
  nota: number;
  posterUrl: string | null;
  /** apenas streamings de assinatura (flatrate) no Brasil */
  streamings: Provider[];
}

export interface Filters {
  streamings: number[];
  generos: number[];
  anoDe: number | null;
  anoAte: number | null;
  notaMin: number | null;
  ordem: SortOrder;
}

export interface TitlePage {
  titles: Title[];
  page: number;
  totalPages: number;
}

export const DEFAULT_FILTERS: Filters = {
  streamings: [],
  generos: [],
  anoDe: null,
  anoAte: null,
  notaMin: null,
  ordem: 'popularidade',
};

/** O TMDB não aceita page > 500 no discover. */
export const MAX_TMDB_PAGE = 500;

export const CATALOG_PATHS: Record<TitleType, string> = {
  filme: '/filmes',
  serie: '/series',
};
```

- [ ] **Step 7: Escrever o teste que falha — `src/lib/filters.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  filtersHref,
  parseFilters,
  parsePage,
  parseTitleType,
  serializeFilters,
  toQueryString,
} from './filters';
import { DEFAULT_FILTERS, type Filters } from './types';

const completo: Filters = {
  streamings: [8, 119],
  generos: [35],
  anoDe: 2010,
  anoAte: 2024,
  notaMin: 7,
  ordem: 'nota',
};

describe('parseFilters', () => {
  it('retorna os padrões quando não há parâmetros', () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros de URLSearchParams', () => {
    const params = new URLSearchParams('streaming=8,119&genero=35&anoDe=2010&anoAte=2024&notaMin=7&ordem=nota');
    expect(parseFilters(params)).toEqual(completo);
  });

  it('aceita o objeto searchParams do Next e usa o primeiro valor de listas', () => {
    expect(parseFilters({ genero: ['35', '18'], ordem: 'lancamento' })).toMatchObject({
      generos: [35],
      ordem: 'lancamento',
    });
  });

  it('ignora valores inválidos e usa o padrão', () => {
    const filters = parseFilters({
      streaming: 'abc,8,-1,2.5,',
      genero: '',
      anoDe: '19',
      anoAte: 'xyz',
      notaMin: '11',
      ordem: 'aleatoria',
    });
    expect(filters).toEqual({ ...DEFAULT_FILTERS, streamings: [8] });
  });

  it('remove IDs repetidos', () => {
    expect(parseFilters({ streaming: '8,8,119' }).streamings).toEqual([8, 119]);
  });

  it('troca anoDe e anoAte quando estão invertidos', () => {
    expect(parseFilters({ anoDe: '2024', anoAte: '2010' })).toMatchObject({ anoDe: 2010, anoAte: 2024 });
  });

  it('aceita nota decimal', () => {
    expect(parseFilters({ notaMin: '7.5' }).notaMin).toBe(7.5);
  });
});

describe('serializeFilters / toQueryString / filtersHref', () => {
  it('não gera parâmetros para os padrões', () => {
    expect(serializeFilters(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('serializa todos os filtros na ordem fixa', () => {
    expect(toQueryString(completo)).toBe('streaming=8,119&genero=35&anoDe=2010&anoAte=2024&notaMin=7&ordem=nota');
  });

  it('ida e volta preserva os filtros', () => {
    expect(parseFilters(serializeFilters(completo))).toEqual(completo);
  });

  it('monta o href sem "?" quando não há filtros', () => {
    expect(filtersHref('/filmes', DEFAULT_FILTERS)).toBe('/filmes');
    expect(filtersHref('/filmes', { ...DEFAULT_FILTERS, streamings: [8, 119] })).toBe('/filmes?streaming=8,119');
  });
});

describe('parsePage', () => {
  it.each([
    [null, 1],
    [undefined, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-3', 1],
    ['2.5', 1],
    ['3', 3],
    ['9999', 500],
  ])('parsePage(%s) = %s', (raw, esperado) => {
    expect(parsePage(raw)).toBe(esperado);
  });
});

describe('parseTitleType', () => {
  it('aceita apenas filme e serie', () => {
    expect(parseTitleType('filme')).toBe('filme');
    expect(parseTitleType('serie')).toBe('serie');
    expect(parseTitleType('movie')).toBeNull();
    expect(parseTitleType(null)).toBeNull();
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `npm test -- src/lib/filters.test.ts`
Expected: FAIL — não resolve `./filters`.

- [ ] **Step 9: Implementar `src/lib/filters.ts`**

```ts
import { z } from 'zod';
import { DEFAULT_FILTERS, MAX_TMDB_PAGE, type Filters, type TitleType } from './types';

export type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

const idSchema = z.coerce.number().int().positive();
const yearSchema = z.coerce.number().int().min(1870).max(2100);
const notaSchema = z.coerce.number().min(0).max(10);
const ordemSchema = z.enum(['popularidade', 'nota', 'lancamento']);
const intSchema = z.coerce.number().int();

function read(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseOptional<T>(schema: z.ZodType<T>, raw: string | null | undefined): T | null {
  if (raw === null || raw === undefined || raw.trim() === '') return null;
  const result = schema.safeParse(raw.trim());
  return result.success ? result.data : null;
}

function parseIdList(raw: string | undefined): number[] {
  if (!raw) return [];
  const ids = raw
    .split(',')
    .map((part) => parseOptional(idSchema, part))
    .filter((id): id is number => id !== null);
  return [...new Set(ids)];
}

export function parseFilters(params: RawParams): Filters {
  let anoDe = parseOptional(yearSchema, read(params, 'anoDe'));
  let anoAte = parseOptional(yearSchema, read(params, 'anoAte'));
  if (anoDe !== null && anoAte !== null && anoDe > anoAte) {
    [anoDe, anoAte] = [anoAte, anoDe];
  }
  return {
    streamings: parseIdList(read(params, 'streaming')),
    generos: parseIdList(read(params, 'genero')),
    anoDe,
    anoAte,
    notaMin: parseOptional(notaSchema, read(params, 'notaMin')),
    ordem: parseOptional(ordemSchema, read(params, 'ordem')) ?? DEFAULT_FILTERS.ordem,
  };
}

export function serializeFilters(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.streamings.length > 0) params.set('streaming', filters.streamings.join(','));
  if (filters.generos.length > 0) params.set('genero', filters.generos.join(','));
  if (filters.anoDe !== null) params.set('anoDe', String(filters.anoDe));
  if (filters.anoAte !== null) params.set('anoAte', String(filters.anoAte));
  if (filters.notaMin !== null) params.set('notaMin', String(filters.notaMin));
  if (filters.ordem !== DEFAULT_FILTERS.ordem) params.set('ordem', filters.ordem);
  return params;
}

/** Query string com vírgulas legíveis (URLSearchParams codifica "," como "%2C"). */
export function toQueryString(filters: Filters): string {
  return serializeFilters(filters).toString().replace(/%2C/g, ',');
}

export function filtersHref(pathname: string, filters: Filters): string {
  const query = toQueryString(filters);
  return query ? `${pathname}?${query}` : pathname;
}

export function parseTitleType(raw: string | null | undefined): TitleType | null {
  return raw === 'filme' || raw === 'serie' ? raw : null;
}

export function parsePage(raw: string | null | undefined): number {
  const page = parseOptional(intSchema, raw);
  if (page === null || page < 1) return 1;
  return Math.min(page, MAX_TMDB_PAGE);
}
```

- [ ] **Step 10: Rodar testes, lint e typecheck**

Run: `npm test && npm run lint && npm run typecheck`
Expected: todos os testes de `filters.test.ts` PASS; lint e typecheck sem erros.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: projeto Next.js com Vitest + feat: tipos e filtros de URL"
```

---

### Task 2: Cliente HTTP do TMDB

**Files:**
- Create: `src/lib/tmdb/schemas.ts`, `src/lib/tmdb/client.ts`
- Test: `src/lib/tmdb/client.test.ts`

**Interfaces:**
- Consumes: `test/msw.ts` (`server`, `useMsw`, `TMDB`).
- Produces:
  - `schemas.ts`: `rawMovieSchema`, `rawTvSchema`, `moviePageSchema`, `tvPageSchema`, `rawProviderSchema`, `providerListSchema`, `titleProvidersSchema`, `genreListSchema`, e tipos `RawMovie`, `RawTv`, `RawProvider`.
  - `client.ts`: `REGION = 'BR'`, `REVALIDATE = { week, day, sixHours, hour }` (segundos), `type TmdbErrorKind = 'unauthorized' | 'not_found' | 'rate_limited' | 'unavailable'`, `class TmdbError extends Error { kind: TmdbErrorKind; status?: number }`, `interface TmdbFetchOptions { params?: Record<string, string | number | undefined>; revalidate: number }`, `tmdbFetch<T>(path: string, schema: z.ZodType<T>, options: TmdbFetchOptions): Promise<T>`. Lê `TMDB_API_BASE_URL` (opcional, padrão `https://api.themoviedb.org/3`) e `TMDB_READ_TOKEN` a cada chamada.

- [ ] **Step 1: Escrever `src/lib/tmdb/schemas.ts`**

```ts
import { z } from 'zod';

export const rawMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  release_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  poster_path: z.string().nullish(),
  popularity: z.number().nullish(),
});

export const rawTvSchema = z.object({
  id: z.number(),
  name: z.string(),
  first_air_date: z.string().nullish(),
  vote_average: z.number().nullish(),
  poster_path: z.string().nullish(),
  popularity: z.number().nullish(),
});

export const moviePageSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  results: z.array(rawMovieSchema),
});

export const tvPageSchema = z.object({
  page: z.number(),
  total_pages: z.number(),
  results: z.array(rawTvSchema),
});

export const rawProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullish(),
  display_priority: z.number().nullish(),
  display_priorities: z.record(z.string(), z.number()).nullish(),
});

export const providerListSchema = z.object({
  results: z.array(rawProviderSchema),
});

export const titleProvidersSchema = z.object({
  results: z.record(z.string(), z.object({ flatrate: z.array(rawProviderSchema).nullish() })),
});

export const genreListSchema = z.object({
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
});

export type RawMovie = z.infer<typeof rawMovieSchema>;
export type RawTv = z.infer<typeof rawTvSchema>;
export type RawProvider = z.infer<typeof rawProviderSchema>;
```

- [ ] **Step 2: Escrever o teste que falha — `src/lib/tmdb/client.test.ts`**

```ts
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { server, TMDB, useMsw } from '../../../test/msw';
import { TmdbError, tmdbFetch } from './client';

useMsw();

const schema = z.object({ ok: z.boolean() });
const opts = { revalidate: 60 };

afterEach(() => {
  process.env.TMDB_READ_TOKEN = 'test-token';
  delete process.env.TMDB_API_BASE_URL;
  vi.restoreAllMocks();
});

async function expectTmdbError(promise: Promise<unknown>, kind: string) {
  await expect(promise).rejects.toBeInstanceOf(TmdbError);
  await expect(promise).rejects.toMatchObject({ kind });
}

describe('tmdbFetch', () => {
  it('envia token, idioma pt-BR e parâmetros, e valida a resposta', async () => {
    let captured: Request | undefined;
    server.use(
      http.get(`${TMDB}/teste`, ({ request }) => {
        captured = request;
        return HttpResponse.json({ ok: true, extra: 1 });
      }),
    );

    const data = await tmdbFetch('/teste', schema, { params: { page: 2, vazio: undefined }, revalidate: 60 });

    expect(data).toEqual({ ok: true });
    const url = new URL(captured!.url);
    expect(captured!.headers.get('authorization')).toBe('Bearer test-token');
    expect(url.searchParams.get('language')).toBe('pt-BR');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.has('vazio')).toBe(false);
  });

  it('usa TMDB_API_BASE_URL quando definida', async () => {
    process.env.TMDB_API_BASE_URL = 'http://localhost:4010/3';
    server.use(http.get('http://localhost:4010/3/teste', () => HttpResponse.json({ ok: true })));
    await expect(tmdbFetch('/teste', schema, opts)).resolves.toEqual({ ok: true });
  });

  it('falha com unauthorized quando não há token', async () => {
    delete process.env.TMDB_READ_TOKEN;
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'unauthorized');
  });

  it('401 vira unauthorized e é registrado no log', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    server.use(http.get(`${TMDB}/teste`, () => new HttpResponse(null, { status: 401 })));
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'unauthorized');
    expect(log).toHaveBeenCalled();
  });

  it('404 vira not_found', async () => {
    server.use(http.get(`${TMDB}/teste`, () => new HttpResponse(null, { status: 404 })));
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'not_found');
  });

  it('429 seguido de sucesso tenta de novo uma única vez', async () => {
    let calls = 0;
    server.use(
      http.get(`${TMDB}/teste`, () => {
        calls += 1;
        return calls === 1
          ? new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })
          : HttpResponse.json({ ok: true });
      }),
    );
    await expect(tmdbFetch('/teste', schema, opts)).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('429 duas vezes vira rate_limited', async () => {
    server.use(
      http.get(`${TMDB}/teste`, () => new HttpResponse(null, { status: 429, headers: { 'Retry-After': '0' } })),
    );
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'rate_limited');
  });

  it('5xx vira unavailable', async () => {
    server.use(http.get(`${TMDB}/teste`, () => new HttpResponse(null, { status: 503 })));
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'unavailable');
  });

  it('falha de rede vira unavailable', async () => {
    server.use(http.get(`${TMDB}/teste`, () => HttpResponse.error()));
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'unavailable');
  });

  it('resposta fora do formato esperado vira unavailable', async () => {
    server.use(http.get(`${TMDB}/teste`, () => HttpResponse.json({ ok: 'sim' })));
    await expectTmdbError(tmdbFetch('/teste', schema, opts), 'unavailable');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/client.test.ts`
Expected: FAIL — não resolve `./client`.

- [ ] **Step 4: Implementar `src/lib/tmdb/client.ts`**

```ts
import 'server-only';
import type { z } from 'zod';

const DEFAULT_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_RETRY_MS = 1000;
const MAX_RETRY_MS = 5000;

export const REGION = 'BR';

/** Tempos de cache em segundos (next.revalidate). */
export const REVALIDATE = {
  week: 60 * 60 * 24 * 7,
  day: 60 * 60 * 24,
  sixHours: 60 * 60 * 6,
  hour: 60 * 60,
} as const;

export type TmdbErrorKind = 'unauthorized' | 'not_found' | 'rate_limited' | 'unavailable';

export class TmdbError extends Error {
  readonly kind: TmdbErrorKind;
  readonly status?: number;

  constructor(kind: TmdbErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'TmdbError';
    this.kind = kind;
    this.status = status;
  }
}

export interface TmdbFetchOptions {
  params?: Record<string, string | number | undefined>;
  revalidate: number;
}

function buildUrl(path: string, params: TmdbFetchOptions['params'] = {}): URL {
  const base = process.env.TMDB_API_BASE_URL ?? DEFAULT_BASE_URL;
  const url = new URL(`${base}${path}`);
  url.searchParams.set('language', 'pt-BR');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
}

function retryDelayMs(response: Response): number {
  const header = response.headers.get('Retry-After');
  if (header === null) return DEFAULT_RETRY_MS;
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_RETRY_MS;
  return Math.min(seconds * 1000, MAX_RETRY_MS);
}

async function request(url: URL, token: string, revalidate: number): Promise<Response> {
  try {
    return await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      next: { revalidate },
    });
  } catch (error) {
    throw new TmdbError('unavailable', `Falha de rede ao chamar o TMDB: ${String(error)}`);
  }
}

function errorFor(status: number, path: string): TmdbError {
  if (status === 401) {
    console.error('[tmdb] Token inválido (401). Verifique a variável TMDB_READ_TOKEN.');
    return new TmdbError('unauthorized', `TMDB recusou o token em ${path}`, status);
  }
  if (status === 404) return new TmdbError('not_found', `Recurso não encontrado no TMDB: ${path}`, status);
  if (status === 429) return new TmdbError('rate_limited', `Limite de requisições do TMDB em ${path}`, status);
  return new TmdbError('unavailable', `TMDB indisponível (${status}) em ${path}`, status);
}

export async function tmdbFetch<T>(
  path: string,
  schema: z.ZodType<T>,
  { params, revalidate }: TmdbFetchOptions,
): Promise<T> {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) throw new TmdbError('unauthorized', 'TMDB_READ_TOKEN não está configurado');

  const url = buildUrl(path, params);
  let response = await request(url, token, revalidate);
  if (response.status === 429) {
    const wait = retryDelayMs(response);
    await new Promise((resolve) => setTimeout(resolve, wait));
    response = await request(url, token, revalidate);
  }
  if (!response.ok) throw errorFor(response.status, path);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new TmdbError('unavailable', `Resposta inválida do TMDB em ${path}`, response.status);
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new TmdbError('unavailable', `Resposta inesperada do TMDB em ${path}`, response.status);
  }
  return parsed.data;
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb/client.test.ts && npm run typecheck`
Expected: 10 testes PASS; typecheck sem erros (o tipo `next` em `RequestInit` vem de `next-env.d.ts`).

- [ ] **Step 6: Commit**

```bash
git add src/lib/tmdb/schemas.ts src/lib/tmdb/client.ts src/lib/tmdb/client.test.ts
git commit -m "feat: cliente do TMDB com validação, cache e tratamento de erros"
```

---

### Task 3: Mapeadores, streamings, gêneros e discover

**Files:**
- Create: `test/fixtures.ts`, `src/lib/tmdb/mappers.ts`, `src/lib/tmdb/providers.ts`, `src/lib/tmdb/genres.ts`, `src/lib/tmdb/catalog.ts`
- Test: `src/lib/tmdb/mappers.test.ts`, `src/lib/tmdb/providers.test.ts`, `src/lib/tmdb/genres.test.ts`, `src/lib/tmdb/catalog.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `REGION`, `REVALIDATE` (Task 2); schemas e tipos `Raw*` (Task 2); `Filters`, `Title`, `TitlePage`, `Provider`, `Genre`, `TitleType`, `MAX_TMDB_PAGE`, `DEFAULT_FILTERS` (Task 1).
- Produces:
  - `mappers.ts`: `mediaPath(tipo: TitleType): 'movie' | 'tv'`, `yearFrom(date: string | null | undefined): number | null`, `mapMovie(raw: RawMovie): Title`, `mapTv(raw: RawTv): Title` (ambos com `streamings: []`), `mapProvider(raw: RawProvider): Provider`.
  - `providers.ts`: `listStreamingProviders(tipo: TitleType): Promise<Provider[]>`, `getTitleProviders(tipo: TitleType, id: number): Promise<Provider[]>`, `attachProviders(titles: Title[]): Promise<Title[]>`.
  - `genres.ts`: `listGenres(tipo: TitleType): Promise<Genre[]>`.
  - `catalog.ts`: `buildDiscoverParams(tipo: TitleType, filters: Filters, page: number, today?: Date): Record<string, string>`, `discoverTitles(tipo: TitleType, filters: Filters, page: number): Promise<TitlePage>`.
  - `test/fixtures.ts`: `makeTitle(overrides?: Partial<Title>): Title`, `netflix: Provider`, `prime: Provider`.

- [ ] **Step 1: Criar `test/fixtures.ts`**

```ts
import type { Provider, Title } from '@/lib/types';

export const netflix: Provider = { id: 8, nome: 'Netflix', logoUrl: 'https://image.tmdb.org/t/p/w92/netflix.png' };
export const prime: Provider = { id: 119, nome: 'Prime Video', logoUrl: null };

export function makeTitle(overrides: Partial<Title> = {}): Title {
  return {
    id: 1,
    tipo: 'filme',
    titulo: 'Filme Teste',
    ano: 2021,
    nota: 7.5,
    posterUrl: null,
    streamings: [],
    ...overrides,
  };
}
```

- [ ] **Step 2: Escrever o teste que falha — `src/lib/tmdb/mappers.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { mapMovie, mapProvider, mapTv, mediaPath, yearFrom } from './mappers';

describe('mappers', () => {
  it('converte filme do TMDB em Title', () => {
    expect(
      mapMovie({
        id: 1,
        title: 'Duna',
        release_date: '2021-10-21',
        vote_average: 7.756,
        poster_path: '/duna.jpg',
        popularity: 10,
      }),
    ).toEqual({
      id: 1,
      tipo: 'filme',
      titulo: 'Duna',
      ano: 2021,
      nota: 7.8,
      posterUrl: 'https://image.tmdb.org/t/p/w342/duna.jpg',
      streamings: [],
    });
  });

  it('converte série do TMDB em Title', () => {
    expect(
      mapTv({ id: 2, name: 'Dark', first_air_date: '2017-12-01', vote_average: 8.4, poster_path: null }),
    ).toEqual({ id: 2, tipo: 'serie', titulo: 'Dark', ano: 2017, nota: 8.4, posterUrl: null, streamings: [] });
  });

  it('tolera campos ausentes ou vazios', () => {
    expect(mapMovie({ id: 3, title: 'Sem dados', release_date: '' })).toMatchObject({
      ano: null,
      nota: 0,
      posterUrl: null,
    });
  });

  it('converte provider com e sem logo', () => {
    expect(mapProvider({ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' })).toEqual({
      id: 8,
      nome: 'Netflix',
      logoUrl: 'https://image.tmdb.org/t/p/w92/n.png',
    });
    expect(mapProvider({ provider_id: 9, provider_name: 'Sem Logo', logo_path: null }).logoUrl).toBeNull();
  });

  it('extrai o ano apenas de datas no formato AAAA-MM-DD', () => {
    expect(yearFrom('1999-03-31')).toBe(1999);
    expect(yearFrom('')).toBeNull();
    expect(yearFrom(null)).toBeNull();
    expect(yearFrom('em breve')).toBeNull();
  });

  it('traduz o tipo para o caminho do TMDB', () => {
    expect(mediaPath('filme')).toBe('movie');
    expect(mediaPath('serie')).toBe('tv');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/mappers.test.ts`
Expected: FAIL — não resolve `./mappers`.

- [ ] **Step 4: Implementar `src/lib/tmdb/mappers.ts`**

```ts
import type { Provider, Title, TitleType } from '../types';
import type { RawMovie, RawProvider, RawTv } from './schemas';

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function mediaPath(tipo: TitleType): 'movie' | 'tv' {
  return tipo === 'filme' ? 'movie' : 'tv';
}

export function yearFrom(date: string | null | undefined): number | null {
  const match = date?.match(/^(\d{4})-\d{2}-\d{2}/);
  return match ? Number(match[1]) : null;
}

function roundNota(value: number | null | undefined): number {
  return Math.round((value ?? 0) * 10) / 10;
}

function posterUrl(path: string | null | undefined): string | null {
  return path ? `${IMAGE_BASE}/w342${path}` : null;
}

export function mapMovie(raw: RawMovie): Title {
  return {
    id: raw.id,
    tipo: 'filme',
    titulo: raw.title,
    ano: yearFrom(raw.release_date),
    nota: roundNota(raw.vote_average),
    posterUrl: posterUrl(raw.poster_path),
    streamings: [],
  };
}

export function mapTv(raw: RawTv): Title {
  return {
    id: raw.id,
    tipo: 'serie',
    titulo: raw.name,
    ano: yearFrom(raw.first_air_date),
    nota: roundNota(raw.vote_average),
    posterUrl: posterUrl(raw.poster_path),
    streamings: [],
  };
}

export function mapProvider(raw: RawProvider): Provider {
  return {
    id: raw.provider_id,
    nome: raw.provider_name,
    logoUrl: raw.logo_path ? `${IMAGE_BASE}/w92${raw.logo_path}` : null,
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb/mappers.test.ts`
Expected: PASS.

- [ ] **Step 6: Escrever os testes que falham — `providers.test.ts` e `genres.test.ts`**

`src/lib/tmdb/providers.test.ts`:
```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { makeTitle } from '../../../test/fixtures';
import { attachProviders, getTitleProviders, listStreamingProviders } from './providers';

useMsw();

const netflixRaw = {
  provider_id: 8,
  provider_name: 'Netflix',
  logo_path: '/n.png',
  display_priority: 5,
  display_priorities: { BR: 1 },
};
const primeRaw = {
  provider_id: 119,
  provider_name: 'Prime Video',
  logo_path: null,
  display_priority: 1,
  display_priorities: { BR: 2 },
};

describe('listStreamingProviders', () => {
  it('pede os providers do BR e ordena pela prioridade no BR', async () => {
    let region: string | null = null;
    server.use(
      http.get(`${TMDB}/watch/providers/movie`, ({ request }) => {
        region = new URL(request.url).searchParams.get('watch_region');
        return HttpResponse.json({ results: [primeRaw, netflixRaw] });
      }),
    );
    const providers = await listStreamingProviders('filme');
    expect(region).toBe('BR');
    expect(providers.map((p) => p.id)).toEqual([8, 119]);
    expect(providers[1]).toEqual({ id: 119, nome: 'Prime Video', logoUrl: null });
  });

  it('usa o endpoint de TV para séries', async () => {
    server.use(http.get(`${TMDB}/watch/providers/tv`, () => HttpResponse.json({ results: [netflixRaw] })));
    await expect(listStreamingProviders('serie')).resolves.toHaveLength(1);
  });
});

describe('getTitleProviders', () => {
  it('retorna apenas os streamings de assinatura do BR, ordenados', async () => {
    server.use(
      http.get(`${TMDB}/movie/1/watch/providers`, () =>
        HttpResponse.json({
          id: 1,
          results: {
            BR: {
              flatrate: [
                { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 5 },
                { provider_id: 119, provider_name: 'Prime Video', logo_path: null, display_priority: 1 },
              ],
            },
            US: { flatrate: [{ provider_id: 15, provider_name: 'Hulu', logo_path: null, display_priority: 1 }] },
          },
        }),
      ),
    );
    const providers = await getTitleProviders('filme', 1);
    expect(providers.map((p) => p.id)).toEqual([119, 8]);
  });

  it('retorna lista vazia sem BR ou sem flatrate', async () => {
    server.use(
      http.get(`${TMDB}/movie/2/watch/providers`, () => HttpResponse.json({ id: 2, results: {} })),
      http.get(`${TMDB}/tv/3/watch/providers`, () =>
        HttpResponse.json({ id: 3, results: { BR: { rent: [] } } }),
      ),
    );
    await expect(getTitleProviders('filme', 2)).resolves.toEqual([]);
    await expect(getTitleProviders('serie', 3)).resolves.toEqual([]);
  });
});

describe('attachProviders', () => {
  it('preenche os streamings e deixa vazio quando um título falha', async () => {
    server.use(
      http.get(`${TMDB}/movie/1/watch/providers`, () =>
        HttpResponse.json({ id: 1, results: { BR: { flatrate: [netflixRaw] } } }),
      ),
      http.get(`${TMDB}/tv/2/watch/providers`, () => new HttpResponse(null, { status: 500 })),
    );
    const [filme, serie] = await attachProviders([
      makeTitle({ id: 1, tipo: 'filme' }),
      makeTitle({ id: 2, tipo: 'serie' }),
    ]);
    expect(filme.streamings.map((p) => p.nome)).toEqual(['Netflix']);
    expect(serie.streamings).toEqual([]);
  });
});
```

`src/lib/tmdb/genres.test.ts`:
```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { listGenres } from './genres';

useMsw();

describe('listGenres', () => {
  it('converte e ordena os gêneros por nome em pt-BR', async () => {
    server.use(
      http.get(`${TMDB}/genre/tv/list`, () =>
        HttpResponse.json({
          genres: [
            { id: 18, name: 'Drama' },
            { id: 16, name: 'Animação' },
          ],
        }),
      ),
    );
    await expect(listGenres('serie')).resolves.toEqual([
      { id: 16, nome: 'Animação' },
      { id: 18, nome: 'Drama' },
    ]);
  });
});
```

- [ ] **Step 7: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/providers.test.ts src/lib/tmdb/genres.test.ts`
Expected: FAIL — não resolve `./providers` e `./genres`.

- [ ] **Step 8: Implementar `providers.ts` e `genres.ts`**

`src/lib/tmdb/providers.ts`:
```ts
import 'server-only';
import type { Provider, Title, TitleType } from '../types';
import { REGION, REVALIDATE, tmdbFetch } from './client';
import { mapProvider, mediaPath } from './mappers';
import { providerListSchema, titleProvidersSchema, type RawProvider } from './schemas';

function priority(raw: RawProvider): number {
  return raw.display_priorities?.[REGION] ?? raw.display_priority ?? Number.MAX_SAFE_INTEGER;
}

function byPriority(a: RawProvider, b: RawProvider): number {
  return priority(a) - priority(b);
}

export async function listStreamingProviders(tipo: TitleType): Promise<Provider[]> {
  const data = await tmdbFetch(`/watch/providers/${mediaPath(tipo)}`, providerListSchema, {
    params: { watch_region: REGION },
    revalidate: REVALIDATE.week,
  });
  return [...data.results].sort(byPriority).map(mapProvider);
}

export async function getTitleProviders(tipo: TitleType, id: number): Promise<Provider[]> {
  const data = await tmdbFetch(`/${mediaPath(tipo)}/${id}/watch/providers`, titleProvidersSchema, {
    revalidate: REVALIDATE.day,
  });
  const flatrate = data.results[REGION]?.flatrate ?? [];
  return [...flatrate].sort(byPriority).map(mapProvider);
}

/** Busca os streamings de cada título em paralelo; uma falha deixa só aquele título sem streamings. */
export async function attachProviders(titles: Title[]): Promise<Title[]> {
  const results = await Promise.allSettled(titles.map((title) => getTitleProviders(title.tipo, title.id)));
  return titles.map((title, index) => {
    const result = results[index];
    return { ...title, streamings: result.status === 'fulfilled' ? result.value : [] };
  });
}
```

`src/lib/tmdb/genres.ts`:
```ts
import 'server-only';
import type { Genre, TitleType } from '../types';
import { REVALIDATE, tmdbFetch } from './client';
import { mediaPath } from './mappers';
import { genreListSchema } from './schemas';

export async function listGenres(tipo: TitleType): Promise<Genre[]> {
  const data = await tmdbFetch(`/genre/${mediaPath(tipo)}/list`, genreListSchema, {
    revalidate: REVALIDATE.week,
  });
  return data.genres
    .map((genre) => ({ id: genre.id, nome: genre.name }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb/providers.test.ts src/lib/tmdb/genres.test.ts`
Expected: PASS.

- [ ] **Step 10: Escrever o teste que falha — `src/lib/tmdb/catalog.test.ts`**

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { DEFAULT_FILTERS, type Filters } from '../types';
import { buildDiscoverParams, discoverTitles } from './catalog';

useMsw();

const today = new Date('2026-09-23T12:00:00Z');
const base = {
  watch_region: 'BR',
  with_watch_monetization_types: 'flatrate',
  include_adult: 'false',
};

describe('buildDiscoverParams', () => {
  it('usa só região, flatrate e popularidade quando não há filtros', () => {
    expect(buildDiscoverParams('filme', DEFAULT_FILTERS, 1, today)).toEqual({
      ...base,
      page: '1',
      sort_by: 'popularity.desc',
    });
  });

  it('traduz todos os filtros para filmes (streamings e gêneros com OU)', () => {
    const filters: Filters = {
      streamings: [8, 119],
      generos: [35, 18],
      anoDe: 2010,
      anoAte: 2024,
      notaMin: 7,
      ordem: 'popularidade',
    };
    expect(buildDiscoverParams('filme', filters, 3, today)).toEqual({
      ...base,
      page: '3',
      sort_by: 'popularity.desc',
      with_watch_providers: '8|119',
      with_genres: '35|18',
      'primary_release_date.gte': '2010-01-01',
      'primary_release_date.lte': '2024-12-31',
      'vote_average.gte': '7',
    });
  });

  it('usa first_air_date para séries', () => {
    const params = buildDiscoverParams('serie', { ...DEFAULT_FILTERS, anoDe: 2015, anoAte: 2020 }, 1, today);
    expect(params['first_air_date.gte']).toBe('2015-01-01');
    expect(params['first_air_date.lte']).toBe('2020-12-31');
    expect(params).not.toHaveProperty('primary_release_date.gte');
  });

  it('ordenar por nota exige no mínimo 200 votos', () => {
    const params = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'nota' }, 1, today);
    expect(params.sort_by).toBe('vote_average.desc');
    expect(params['vote_count.gte']).toBe('200');
  });

  it('ordenar por lançamento esconde títulos futuros', () => {
    const lancamento = { ...DEFAULT_FILTERS, ordem: 'lancamento' as const };
    const filme = buildDiscoverParams('filme', lancamento, 1, today);
    expect(filme.sort_by).toBe('primary_release_date.desc');
    expect(filme['primary_release_date.lte']).toBe('2026-09-23');

    const serie = buildDiscoverParams('serie', lancamento, 1, today);
    expect(serie.sort_by).toBe('first_air_date.desc');
    expect(serie['first_air_date.lte']).toBe('2026-09-23');
  });

  it('em lançamento, mantém anoAte do passado e limita anoAte do futuro a hoje', () => {
    const passado = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'lancamento', anoAte: 2020 }, 1, today);
    expect(passado['primary_release_date.lte']).toBe('2020-12-31');
    const futuro = buildDiscoverParams('filme', { ...DEFAULT_FILTERS, ordem: 'lancamento', anoAte: 2030 }, 1, today);
    expect(futuro['primary_release_date.lte']).toBe('2026-09-23');
  });
});

describe('discoverTitles', () => {
  function providersHandler() {
    return http.get(`${TMDB}/:media/:id/watch/providers`, ({ params }) =>
      HttpResponse.json({
        id: Number(params.id),
        results:
          params.id === '1'
            ? { BR: { flatrate: [{ provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1 }] } }
            : {},
      }),
    );
  }

  it('busca filmes, anexa streamings e limita totalPages a 500', async () => {
    let received: URLSearchParams | undefined;
    server.use(
      http.get(`${TMDB}/discover/movie`, ({ request }) => {
        received = new URL(request.url).searchParams;
        return HttpResponse.json({
          page: 2,
          total_pages: 900,
          results: [
            { id: 1, title: 'Com Netflix', release_date: '2020-01-01', vote_average: 7, poster_path: null },
            { id: 2, title: 'Sem Logos', release_date: '2019-01-01', vote_average: 6, poster_path: null },
          ],
        });
      }),
      providersHandler(),
    );

    const result = await discoverTitles('filme', { ...DEFAULT_FILTERS, generos: [35] }, 2);

    expect(received?.get('page')).toBe('2');
    expect(received?.get('with_genres')).toBe('35');
    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(500);
    expect(result.titles.map((t) => t.titulo)).toEqual(['Com Netflix', 'Sem Logos']);
    expect(result.titles[0].streamings.map((p) => p.nome)).toEqual(['Netflix']);
    expect(result.titles[1].streamings).toEqual([]);
  });

  it('busca séries no endpoint de TV', async () => {
    server.use(
      http.get(`${TMDB}/discover/tv`, () =>
        HttpResponse.json({ page: 1, total_pages: 1, results: [{ id: 5, name: 'Dark', first_air_date: '2017-12-01' }] }),
      ),
      providersHandler(),
    );
    const result = await discoverTitles('serie', DEFAULT_FILTERS, 1);
    expect(result.titles[0]).toMatchObject({ tipo: 'serie', titulo: 'Dark', ano: 2017 });
  });

  it('limita a página pedida a 500', async () => {
    let page: string | null = null;
    server.use(
      http.get(`${TMDB}/discover/movie`, ({ request }) => {
        page = new URL(request.url).searchParams.get('page');
        return HttpResponse.json({ page: 500, total_pages: 500, results: [] });
      }),
    );
    await discoverTitles('filme', DEFAULT_FILTERS, 9999);
    expect(page).toBe('500');
  });
});
```

- [ ] **Step 11: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/catalog.test.ts`
Expected: FAIL — não resolve `./catalog`.

- [ ] **Step 12: Implementar `src/lib/tmdb/catalog.ts`**

```ts
import 'server-only';
import { MAX_TMDB_PAGE, type Filters, type Title, type TitlePage, type TitleType } from '../types';
import { REGION, REVALIDATE, tmdbFetch } from './client';
import { mapMovie, mapTv, mediaPath } from './mappers';
import { attachProviders } from './providers';
import { moviePageSchema, tvPageSchema } from './schemas';

/** Sem esse mínimo, títulos com 2 ou 3 votos dominam a ordenação por nota. */
const MIN_VOTES_FOR_RATING_SORT = 200;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDiscoverParams(
  tipo: TitleType,
  filters: Filters,
  page: number,
  today: Date = new Date(),
): Record<string, string> {
  const dateField = tipo === 'filme' ? 'primary_release_date' : 'first_air_date';
  const params: Record<string, string> = {
    watch_region: REGION,
    with_watch_monetization_types: 'flatrate',
    include_adult: 'false',
    page: String(page),
  };

  if (filters.streamings.length > 0) params.with_watch_providers = filters.streamings.join('|');
  if (filters.generos.length > 0) params.with_genres = filters.generos.join('|');
  if (filters.anoDe !== null) params[`${dateField}.gte`] = `${filters.anoDe}-01-01`;
  if (filters.anoAte !== null) params[`${dateField}.lte`] = `${filters.anoAte}-12-31`;
  if (filters.notaMin !== null) params['vote_average.gte'] = String(filters.notaMin);

  switch (filters.ordem) {
    case 'popularidade':
      params.sort_by = 'popularity.desc';
      break;
    case 'nota':
      params.sort_by = 'vote_average.desc';
      params['vote_count.gte'] = String(MIN_VOTES_FOR_RATING_SORT);
      break;
    case 'lancamento': {
      params.sort_by = `${dateField}.desc`;
      const todayIso = isoDate(today);
      const lte = params[`${dateField}.lte`];
      if (!lte || lte > todayIso) params[`${dateField}.lte`] = todayIso;
      break;
    }
  }
  return params;
}

export async function discoverTitles(tipo: TitleType, filters: Filters, page: number): Promise<TitlePage> {
  const safePage = Math.min(Math.max(1, Math.trunc(page)), MAX_TMDB_PAGE);
  const path = `/discover/${mediaPath(tipo)}`;
  const options = { params: buildDiscoverParams(tipo, filters, safePage), revalidate: REVALIDATE.sixHours };

  let result: { page: number; totalPages: number; titles: Title[] };
  if (tipo === 'filme') {
    const data = await tmdbFetch(path, moviePageSchema, options);
    result = { page: data.page, totalPages: data.total_pages, titles: data.results.map(mapMovie) };
  } else {
    const data = await tmdbFetch(path, tvPageSchema, options);
    result = { page: data.page, totalPages: data.total_pages, titles: data.results.map(mapTv) };
  }

  return {
    page: result.page,
    totalPages: Math.min(result.totalPages, MAX_TMDB_PAGE),
    titles: await attachProviders(result.titles),
  };
}
```

- [ ] **Step 13: Rodar todos os testes e typecheck**

Run: `npm test && npm run typecheck`
Expected: tudo PASS.

- [ ] **Step 14: Commit**

```bash
git add test/fixtures.ts src/lib/tmdb
git commit -m "feat: mapeadores, streamings, gêneros e discover do TMDB"
```

---

### Task 4: Busca por título

**Files:**
- Create: `src/lib/tmdb/search.ts`
- Test: `src/lib/tmdb/search.test.ts`

**Interfaces:**
- Consumes: `tmdbFetch`, `REVALIDATE` (Task 2); `moviePageSchema`, `tvPageSchema` (Task 2); `mapMovie`, `mapTv` (Task 3); `attachProviders` (Task 3).
- Produces: `searchTitles(query: string): Promise<Title[]>` — no máximo 20 títulos, filmes e séries juntos, ordenados por popularidade (desc), com `streamings` preenchido.

- [ ] **Step 1: Escrever o teste que falha — `src/lib/tmdb/search.test.ts`**

```ts
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, TMDB, useMsw } from '../../../test/msw';
import { searchTitles } from './search';

useMsw();

const noProviders = http.get(`${TMDB}/:media/:id/watch/providers`, ({ params }) =>
  HttpResponse.json({ id: Number(params.id), results: {} }),
);

function pageOf(results: unknown[]) {
  return { page: 1, total_pages: 1, results };
}

describe('searchTitles', () => {
  it('não chama a API para texto vazio ou só com espaços', async () => {
    await expect(searchTitles('')).resolves.toEqual([]);
    await expect(searchTitles('    ')).resolves.toEqual([]);
  });

  it('junta filmes e séries ordenados por popularidade', async () => {
    server.use(
      http.get(`${TMDB}/search/movie`, () =>
        HttpResponse.json(
          pageOf([
            { id: 1, title: 'Filme A', popularity: 10 },
            { id: 2, title: 'Filme B', popularity: 50 },
          ]),
        ),
      ),
      http.get(`${TMDB}/search/tv`, () => HttpResponse.json(pageOf([{ id: 3, name: 'Série C', popularity: 30 }]))),
      noProviders,
    );

    const titles = await searchTitles('teste');

    expect(titles.map((t) => [t.titulo, t.tipo])).toEqual([
      ['Filme B', 'filme'],
      ['Série C', 'serie'],
      ['Filme A', 'filme'],
    ]);
  });

  it('limita o resultado a 20 títulos', async () => {
    const movies = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, title: `F${i}`, popularity: i }));
    const shows = Array.from({ length: 15 }, (_, i) => ({ id: i + 100, name: `S${i}`, popularity: i }));
    server.use(
      http.get(`${TMDB}/search/movie`, () => HttpResponse.json(pageOf(movies))),
      http.get(`${TMDB}/search/tv`, () => HttpResponse.json(pageOf(shows))),
      noProviders,
    );
    await expect(searchTitles('x')).resolves.toHaveLength(20);
  });

  it('envia o texto aparado, com acentos e & codificados corretamente', async () => {
    const queries: (string | null)[] = [];
    const capture = (request: Request) => {
      queries.push(new URL(request.url).searchParams.get('query'));
      return HttpResponse.json(pageOf([]));
    };
    server.use(
      http.get(`${TMDB}/search/movie`, ({ request }) => capture(request)),
      http.get(`${TMDB}/search/tv`, ({ request }) => capture(request)),
    );
    await searchTitles('  Amélie & cia ');
    expect(queries).toEqual(['Amélie & cia', 'Amélie & cia']);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/lib/tmdb/search.test.ts`
Expected: FAIL — não resolve `./search`.

- [ ] **Step 3: Implementar `src/lib/tmdb/search.ts`**

```ts
import 'server-only';
import type { Title } from '../types';
import { REVALIDATE, tmdbFetch } from './client';
import { mapMovie, mapTv } from './mappers';
import { attachProviders } from './providers';
import { moviePageSchema, tvPageSchema } from './schemas';

const MAX_SEARCH_RESULTS = 20;

export async function searchTitles(query: string): Promise<Title[]> {
  const text = query.trim();
  if (!text) return [];

  const options = {
    params: { query: text, include_adult: 'false', page: 1 },
    revalidate: REVALIDATE.hour,
  };
  const [movies, shows] = await Promise.all([
    tmdbFetch('/search/movie', moviePageSchema, options),
    tmdbFetch('/search/tv', tvPageSchema, options),
  ]);

  const ranked = [
    ...movies.results.map((raw) => ({ popularity: raw.popularity ?? 0, title: mapMovie(raw) })),
    ...shows.results.map((raw) => ({ popularity: raw.popularity ?? 0, title: mapTv(raw) })),
  ]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, MAX_SEARCH_RESULTS)
    .map((item) => item.title);

  return attachProviders(ranked);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/lib/tmdb/search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tmdb/search.ts src/lib/tmdb/search.test.ts
git commit -m "feat: busca de filmes e séries por título"
```

---

### Task 5: Route Handler `/api/titles`

**Files:**
- Create: `src/app/api/titles/route.ts`
- Test: `src/app/api/titles/route.test.ts`

**Interfaces:**
- Consumes: `parseFilters`, `parsePage`, `parseTitleType` (Task 1); `discoverTitles` (Task 3).
- Produces: `GET /api/titles?tipo=filme|serie&page=N&<filtros>` → `200` com `TitlePage` em JSON; `400 { error }` se `tipo` inválido; `502 { error }` se o TMDB falhar.

- [ ] **Step 1: Escrever o teste que falha — `src/app/api/titles/route.test.ts`**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/types';

const { discoverTitles } = vi.hoisted(() => ({ discoverTitles: vi.fn() }));
vi.mock('@/lib/tmdb/catalog', () => ({ discoverTitles }));

import { GET } from './route';

function get(query: string) {
  return GET(new Request(`http://localhost/api/titles?${query}`));
}

describe('GET /api/titles', () => {
  beforeEach(() => {
    discoverTitles.mockReset();
  });

  it('retorna 400 para tipo inválido', async () => {
    const response = await get('tipo=anime&page=2');
    expect(response.status).toBe(400);
    expect(discoverTitles).not.toHaveBeenCalled();
  });

  it('repassa tipo, filtros e página e devolve o JSON', async () => {
    const page = { titles: [], page: 2, totalPages: 5 };
    discoverTitles.mockResolvedValue(page);

    const response = await get('tipo=serie&page=2&genero=35');

    expect(discoverTitles).toHaveBeenCalledWith('serie', { ...DEFAULT_FILTERS, generos: [35] }, 2);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(page);
  });

  it('usa página 1 quando page é inválida', async () => {
    discoverTitles.mockResolvedValue({ titles: [], page: 1, totalPages: 1 });
    await get('tipo=filme&page=abc');
    expect(discoverTitles).toHaveBeenCalledWith('filme', DEFAULT_FILTERS, 1);
  });

  it('retorna 502 quando o TMDB falha', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    discoverTitles.mockRejectedValue(new Error('TMDB fora'));
    const response = await get('tipo=filme&page=2');
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: 'Falha ao consultar o catálogo' });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/app/api/titles/route.test.ts`
Expected: FAIL — não resolve `./route`.

- [ ] **Step 3: Implementar `src/app/api/titles/route.ts`**

```ts
import { parseFilters, parsePage, parseTitleType } from '@/lib/filters';
import { discoverTitles } from '@/lib/tmdb/catalog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = parseTitleType(searchParams.get('tipo'));
  if (!tipo) {
    return Response.json({ error: 'Parâmetro "tipo" deve ser filme ou serie' }, { status: 400 });
  }

  try {
    const page = await discoverTitles(tipo, parseFilters(searchParams), parsePage(searchParams.get('page')));
    return Response.json(page);
  } catch (error) {
    console.error('[api/titles]', error);
    return Response.json({ error: 'Falha ao consultar o catálogo' }, { status: 502 });
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/app/api/titles/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/titles
git commit -m "feat: endpoint /api/titles para carregar mais títulos"
```

---

### Task 6: Cards, grade e abas

**Files:**
- Modify: `next.config.ts`
- Create: `src/components/TitleCard.tsx`, `src/components/TitleGrid.tsx`, `src/components/TypeTabs.tsx`
- Test: `src/components/TitleCard.test.tsx`, `src/components/TitleGrid.test.tsx`, `src/components/TypeTabs.test.tsx`

**Interfaces:**
- Consumes: `Title`, `TitleType`, `CATALOG_PATHS` (Task 1); `makeTitle`, `netflix`, `prime` (Task 3).
- Produces: `<TitleCard title={Title} showUnavailable?={boolean} />` (renderiza `<article aria-label={titulo}>` com `<h3>`), `<TitleGrid titles={Title[]} showUnavailable?={boolean} />`, `<TypeTabs ativo={TitleType} />`.

- [ ] **Step 1: Configurar imagens em `next.config.ts`**

Substituir o conteúdo por:
```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // O CDN do TMDB já entrega tamanhos prontos (w342, w92). Otimizar de novo na Vercel
    // esgotaria a cota gratuita com centenas de pôsteres.
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: Escrever os testes que falham**

`src/components/TitleCard.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTitle, netflix, prime } from '../../test/fixtures';
import { TitleCard } from './TitleCard';

describe('TitleCard', () => {
  it('mostra pôster, título, ano, nota e logos dos streamings', () => {
    render(
      <TitleCard
        title={makeTitle({
          titulo: 'Duna',
          ano: 2021,
          nota: 7.8,
          posterUrl: 'https://image.tmdb.org/t/p/w342/duna.jpg',
          streamings: [netflix],
        })}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Pôster de Duna' })).toHaveAttribute(
      'src',
      'https://image.tmdb.org/t/p/w342/duna.jpg',
    );
    expect(screen.getByText('2021 · ★ 7,8')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
  });

  it('usa placeholder sem pôster e "Ano desconhecido" sem data', () => {
    render(<TitleCard title={makeTitle({ titulo: 'Raro', ano: null, nota: 0, posterUrl: null })} />);
    expect(screen.queryByRole('img', { name: /Pôster/ })).toBeNull();
    expect(screen.getAllByText('Raro')).toHaveLength(2);
    expect(screen.getByText('Ano desconhecido · ★ 0,0')).toBeInTheDocument();
  });

  it('mostra o nome do streaming quando não há logo', () => {
    render(<TitleCard title={makeTitle({ streamings: [prime] })} />);
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
  });

  it('mostra aviso de indisponível apenas quando pedido', () => {
    const { rerender } = render(<TitleCard title={makeTitle()} />);
    expect(screen.queryByText('Não disponível em streaming no Brasil')).toBeNull();
    rerender(<TitleCard title={makeTitle()} showUnavailable />);
    expect(screen.getByText('Não disponível em streaming no Brasil')).toBeInTheDocument();
  });
});
```

`src/components/TitleGrid.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeTitle } from '../../test/fixtures';
import { TitleGrid } from './TitleGrid';

describe('TitleGrid', () => {
  it('renderiza um item por título, sem colidir filme e série com o mesmo id', () => {
    render(
      <TitleGrid
        titles={[makeTitle({ id: 1, tipo: 'filme', titulo: 'A' }), makeTitle({ id: 1, tipo: 'serie', titulo: 'B' })]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument();
  });
});
```

`src/components/TypeTabs.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TypeTabs } from './TypeTabs';

describe('TypeTabs', () => {
  it('marca a aba ativa e aponta para as rotas sem filtros', () => {
    render(<TypeTabs ativo="serie" />);
    const filmes = screen.getByRole('link', { name: 'Filmes' });
    const series = screen.getByRole('link', { name: 'Séries' });
    expect(filmes).toHaveAttribute('href', '/filmes');
    expect(filmes).not.toHaveAttribute('aria-current');
    expect(series).toHaveAttribute('href', '/series');
    expect(series).toHaveAttribute('aria-current', 'page');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/components`
Expected: FAIL — componentes não existem.

- [ ] **Step 4: Implementar os componentes**

`src/components/TitleCard.tsx`:
```tsx
import Image from 'next/image';
import type { Title } from '@/lib/types';

const notaFormatter = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

interface TitleCardProps {
  title: Title;
  showUnavailable?: boolean;
}

export function TitleCard({ title, showUnavailable = false }: TitleCardProps) {
  return (
    <article aria-label={title.titulo} className="flex flex-col gap-2">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
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
          {title.ano ?? 'Ano desconhecido'} · ★ {notaFormatter.format(title.nota)}
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
  );
}
```

`src/components/TitleGrid.tsx`:
```tsx
import type { Title } from '@/lib/types';
import { TitleCard } from './TitleCard';

interface TitleGridProps {
  titles: Title[];
  showUnavailable?: boolean;
}

export function TitleGrid({ titles, showUnavailable = false }: TitleGridProps) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {titles.map((title) => (
        <li key={`${title.tipo}-${title.id}`}>
          <TitleCard title={title} showUnavailable={showUnavailable} />
        </li>
      ))}
    </ul>
  );
}
```

`src/components/TypeTabs.tsx`:
```tsx
import Link from 'next/link';
import { CATALOG_PATHS, type TitleType } from '@/lib/types';

const TABS: { tipo: TitleType; label: string }[] = [
  { tipo: 'filme', label: 'Filmes' },
  { tipo: 'serie', label: 'Séries' },
];

// Os links não levam os filtros: os IDs de gênero de filmes e séries são diferentes no TMDB.
export function TypeTabs({ ativo }: { ativo: TitleType }) {
  return (
    <nav aria-label="Tipo de título">
      <ul className="flex gap-2">
        {TABS.map((tab) => {
          const active = tab.tipo === ativo;
          return (
            <li key={tab.tipo}>
              <Link
                href={CATALOG_PATHS[tab.tipo]}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/components && npm run typecheck && npm run lint`
Expected: PASS, sem erros.

- [ ] **Step 6: Commit**

```bash
git add next.config.ts src/components
git commit -m "feat: cards, grade de títulos e abas Filmes/Séries"
```

---

### Task 7: Chips de streaming e barra de filtros

**Files:**
- Create: `src/components/ProviderChips.tsx`, `src/components/FilterBar.tsx`
- Test: `src/components/ProviderChips.test.tsx`, `src/components/FilterBar.test.tsx`

**Interfaces:**
- Consumes: `Filters`, `Provider`, `Genre`, `SortOrder` (Task 1); `filtersHref`, `parseFilters` (Task 1); `netflix`, `prime` (Task 3).
- Produces: `<ProviderChips providers={Provider[]} selected={number[]} onToggle={(id: number) => void} />`, `VISIBLE_PROVIDERS = 10`; `<FilterBar filters={Filters} providers={Provider[]} genres={Genre[]} />` (componente cliente que chama `router.push(filtersHref(pathname, next))`).

- [ ] **Step 1: Escrever os testes que falham**

`src/components/ProviderChips.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Provider } from '@/lib/types';
import { ProviderChips } from './ProviderChips';

const doze: Provider[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  nome: `Streaming ${i + 1}`,
  logoUrl: null,
}));

describe('ProviderChips', () => {
  it('mostra os 10 primeiros e expande com "Ver mais"', async () => {
    const user = userEvent.setup();
    render(<ProviderChips providers={doze} selected={[]} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Streaming 10' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Streaming 11' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ver mais (2)' }));

    expect(screen.getByRole('button', { name: 'Streaming 12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver menos' })).toBeInTheDocument();
  });

  it('mantém visível um streaming selecionado fora dos 10 primeiros', () => {
    render(<ProviderChips providers={doze} selected={[12]} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: 'Streaming 12' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Streaming 11' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Ver mais (1)' })).toBeInTheDocument();
  });

  it('chama onToggle com o id e marca os selecionados', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<ProviderChips providers={doze} selected={[2]} onToggle={onToggle} />);
    expect(screen.getByRole('button', { name: 'Streaming 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Streaming 3' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'Streaming 3' }));
    expect(onToggle).toHaveBeenCalledWith(3);
  });

  it('não mostra "Ver mais" com 10 streamings ou menos', () => {
    render(<ProviderChips providers={doze.slice(0, 10)} selected={[]} onToggle={() => {}} />);
    expect(screen.queryByRole('button', { name: /Ver mais/ })).toBeNull();
  });
});
```

`src/components/FilterBar.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, type Filters, type Genre } from '@/lib/types';
import { netflix, prime } from '../../test/fixtures';
import { FilterBar } from './FilterBar';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/filmes',
}));

const genres: Genre[] = [
  { id: 35, nome: 'Comédia' },
  { id: 18, nome: 'Drama' },
];

function renderBar(filters: Filters = DEFAULT_FILTERS) {
  render(<FilterBar filters={filters} providers={[netflix, prime]} genres={genres} />);
  return userEvent.setup();
}

describe('FilterBar', () => {
  beforeEach(() => push.mockReset());

  it('adiciona e remove streaming na URL', async () => {
    const user = renderBar();
    await user.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?streaming=8');
  });

  it('remove o streaming quando já estava selecionado', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, streamings: [8] });
    await user.click(screen.getByRole('button', { name: 'Netflix' }));
    expect(push).toHaveBeenLastCalledWith('/filmes');
  });

  it('combina gênero com os filtros existentes', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, streamings: [8] });
    await user.click(screen.getByRole('button', { name: 'Comédia' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?streaming=8&genero=35');
  });

  it('aplica ordenação e nota mínima ao mudar o select', async () => {
    const user = renderBar();
    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'nota');
    expect(push).toHaveBeenLastCalledWith('/filmes?ordem=nota');
    await user.selectOptions(screen.getByLabelText('Nota mínima'), '7');
    expect(push).toHaveBeenLastCalledWith('/filmes?notaMin=7');
  });

  it('aplica a faixa de anos no envio, corrigindo a ordem', async () => {
    const user = renderBar();
    await user.type(screen.getByLabelText('Ano de'), '2020');
    await user.type(screen.getByLabelText('Ano até'), '2010');
    await user.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(push).toHaveBeenLastCalledWith('/filmes?anoDe=2010&anoAte=2020');
  });

  it('limpa todos os filtros', async () => {
    const user = renderBar({ ...DEFAULT_FILTERS, generos: [35], notaMin: 7 });
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(push).toHaveBeenLastCalledWith('/filmes');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/ProviderChips.test.tsx src/components/FilterBar.test.tsx`
Expected: FAIL — componentes não existem.

- [ ] **Step 3: Implementar `src/components/ProviderChips.tsx`**

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { Provider } from '@/lib/types';

export const VISIBLE_PROVIDERS = 10;

interface ProviderChipsProps {
  providers: Provider[];
  selected: number[];
  onToggle: (id: number) => void;
}

export function ProviderChips({ providers, selected, onToggle }: ProviderChipsProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded
    ? providers
    : providers.filter((provider, index) => index < VISIBLE_PROVIDERS || selected.includes(provider.id));
  const hiddenCount = providers.length - visible.length;
  const showToggle = expanded ? providers.length > VISIBLE_PROVIDERS : hiddenCount > 0;

  return (
    <div role="group" aria-label="Streamings" className="flex flex-wrap items-center gap-2">
      {visible.map((provider) => {
        const active = selected.includes(provider.id);
        return (
          <button
            key={provider.id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(provider.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${
              active ? 'border-zinc-100 bg-zinc-100 text-zinc-900' : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
            }`}
          >
            {provider.logoUrl && (
              <Image src={provider.logoUrl} alt="" width={20} height={20} className="rounded" />
            )}
            <span>{provider.nome}</span>
          </button>
        );
      })}
      {showToggle && (
        <button type="button" onClick={() => setExpanded((value) => !value)} className="text-sm text-zinc-400 underline">
          {expanded ? 'Ver menos' : `Ver mais (${hiddenCount})`}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implementar `src/components/FilterBar.tsx`**

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { filtersHref, parseFilters } from '@/lib/filters';
import type { Filters, Genre, Provider, SortOrder } from '@/lib/types';
import { ProviderChips } from './ProviderChips';

const ORDENS: { value: SortOrder; label: string }[] = [
  { value: 'popularidade', label: 'Popularidade' },
  { value: 'nota', label: 'Nota' },
  { value: 'lancamento', label: 'Lançamento mais recente' },
];

const NOTAS = [5, 6, 7, 8, 9];

const fieldClass = 'rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm';

function toggle(list: number[], id: number): number[] {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

interface FilterBarProps {
  filters: Filters;
  providers: Provider[];
  genres: Genre[];
}

export function FilterBar({ filters, providers, genres }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  function apply(next: Filters) {
    router.push(filtersHref(pathname, next));
  }

  function handleYears(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    // parseFilters valida os anos e corrige a ordem invertida.
    const { anoDe, anoAte } = parseFilters(
      new URLSearchParams({ anoDe: String(data.get('anoDe') ?? ''), anoAte: String(data.get('anoAte') ?? '') }),
    );
    apply({ ...filters, anoDe, anoAte });
  }

  return (
    <section aria-label="Filtros" className="flex flex-col gap-4">
      <ProviderChips
        providers={providers}
        selected={filters.streamings}
        onToggle={(id) => apply({ ...filters, streamings: toggle(filters.streamings, id) })}
      />

      <div role="group" aria-label="Gêneros" className="flex flex-wrap gap-2">
        {genres.map((genre) => {
          const active = filters.generos.includes(genre.id);
          return (
            <button
              key={genre.id}
              type="button"
              aria-pressed={active}
              onClick={() => apply({ ...filters, generos: toggle(filters.generos, genre.id) })}
              className={`rounded-full px-3 py-1 text-xs ${
                active ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {genre.nome}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form key={`${filters.anoDe}-${filters.anoAte}`} onSubmit={handleYears} className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-ano-de" className="text-xs text-zinc-400">
              Ano de
            </label>
            <input
              id="filtro-ano-de"
              name="anoDe"
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              defaultValue={filters.anoDe ?? ''}
              className={`${fieldClass} w-24`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-ano-ate" className="text-xs text-zinc-400">
              Ano até
            </label>
            <input
              id="filtro-ano-ate"
              name="anoAte"
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              defaultValue={filters.anoAte ?? ''}
              className={`${fieldClass} w-24`}
            />
          </div>
          <button type="submit" className="rounded-md bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700">
            Aplicar
          </button>
        </form>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-nota" className="text-xs text-zinc-400">
            Nota mínima
          </label>
          <select
            id="filtro-nota"
            value={filters.notaMin ?? ''}
            onChange={(event) =>
              apply({ ...filters, notaMin: event.target.value === '' ? null : Number(event.target.value) })
            }
            className={fieldClass}
          >
            <option value="">Qualquer</option>
            {NOTAS.map((nota) => (
              <option key={nota} value={nota}>
                {nota}+
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filtro-ordem" className="text-xs text-zinc-400">
            Ordenar por
          </label>
          <select
            id="filtro-ordem"
            value={filters.ordem}
            onChange={(event) => apply({ ...filters, ordem: event.target.value as SortOrder })}
            className={fieldClass}
          >
            {ORDENS.map((ordem) => (
              <option key={ordem.value} value={ordem.value}>
                {ordem.label}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={() => router.push(pathname)} className="text-sm text-zinc-400 underline">
          Limpar filtros
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/components && npm run typecheck && npm run lint`
Expected: PASS, sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/ProviderChips.tsx src/components/ProviderChips.test.tsx src/components/FilterBar.tsx src/components/FilterBar.test.tsx
git commit -m "feat: chips de streaming e barra de filtros sincronizada com a URL"
```

---

### Task 8: Botão "Carregar mais"

**Files:**
- Create: `src/components/LoadMore.tsx`
- Test: `src/components/LoadMore.test.tsx`

**Interfaces:**
- Consumes: `serializeFilters` (Task 1); `Filters`, `Title`, `TitlePage`, `TitleType` (Task 1); `TitleGrid` (Task 6); contrato de `/api/titles` (Task 5).
- Produces: `<LoadMore tipo={TitleType} filters={Filters} initialPage={number} totalPages={number} />` — renderiza os títulos extras numa `TitleGrid` e o botão enquanto `page < totalPages`.

- [ ] **Step 1: Escrever o teste que falha — `src/components/LoadMore.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, type TitlePage } from '@/lib/types';
import { makeTitle } from '../../test/fixtures';
import { LoadMore } from './LoadMore';

const fetchMock = vi.fn();

function ok(body: TitlePage) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const filters = { ...DEFAULT_FILTERS, streamings: [8] };

describe('LoadMore', () => {
  it('não mostra o botão quando já está na última página', () => {
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={1} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('busca a próxima página com os filtros e anexa os títulos', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ titles: [makeTitle({ id: 99, titulo: 'Novo Filme' })], page: 2, totalPages: 3 }));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(fetchMock).toHaveBeenCalledWith('/api/titles?streaming=8&tipo=filme&page=2');
    expect(await screen.findByRole('heading', { name: 'Novo Filme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('esconde o botão depois de carregar a última página', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(ok({ titles: [makeTitle({ id: 2, titulo: 'Último' })], page: 2, totalPages: 2 }));
    render(<LoadMore tipo="serie" filters={DEFAULT_FILTERS} initialPage={1} totalPages={2} />);
    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    await screen.findByRole('heading', { name: 'Último' });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mostra erro e permite tentar de novo', async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 502, json: async () => ({}) })
      .mockResolvedValueOnce(ok({ titles: [makeTitle({ id: 5, titulo: 'Recuperado' })], page: 2, totalPages: 3 }));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar mais títulos.');

    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByRole('heading', { name: 'Recuperado' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('desabilita o botão enquanto carrega', async () => {
    const user = userEvent.setup();
    let resolve: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoadMore tipo="filme" filters={filters} initialPage={1} totalPages={3} />);

    await user.click(screen.getByRole('button', { name: 'Carregar mais' }));

    expect(screen.getByRole('button', { name: 'Carregando…' })).toBeDisabled();
    resolve(ok({ titles: [], page: 2, totalPages: 3 }));
    expect(await screen.findByRole('button', { name: 'Carregar mais' })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/LoadMore.test.tsx`
Expected: FAIL — não resolve `./LoadMore`.

- [ ] **Step 3: Implementar `src/components/LoadMore.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { serializeFilters } from '@/lib/filters';
import type { Filters, Title, TitlePage, TitleType } from '@/lib/types';
import { TitleGrid } from './TitleGrid';

type Status = 'idle' | 'loading' | 'error';

interface LoadMoreProps {
  tipo: TitleType;
  filters: Filters;
  initialPage: number;
  totalPages: number;
}

export function LoadMore({ tipo, filters, initialPage, totalPages }: LoadMoreProps) {
  const [titles, setTitles] = useState<Title[]>([]);
  const [page, setPage] = useState(initialPage);
  const [status, setStatus] = useState<Status>('idle');

  async function loadNext() {
    setStatus('loading');
    const params = serializeFilters(filters);
    params.set('tipo', tipo);
    params.set('page', String(page + 1));
    try {
      const response = await fetch(`/api/titles?${params.toString()}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as TitlePage;
      setTitles((previous) => [
        ...previous,
        ...data.titles.filter((title) => !previous.some((p) => p.id === title.id && p.tipo === title.tipo)),
      ]);
      setPage(data.page);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  const hasMore = page < totalPages;

  return (
    <>
      {titles.length > 0 && <TitleGrid titles={titles} />}
      {hasMore && (
        <div className="flex flex-col items-center gap-2 py-6">
          {status === 'error' && (
            <p role="alert" className="text-sm text-red-400">
              Não foi possível carregar mais títulos.
            </p>
          )}
          <button
            type="button"
            onClick={loadNext}
            disabled={status === 'loading'}
            className="rounded-md bg-zinc-800 px-6 py-2 text-sm font-medium hover:bg-zinc-700 disabled:opacity-50"
          >
            {status === 'loading' ? 'Carregando…' : status === 'error' ? 'Tentar de novo' : 'Carregar mais'}
          </button>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- src/components/LoadMore.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LoadMore.tsx src/components/LoadMore.test.tsx
git commit -m "feat: botão Carregar mais com estados de carregamento e erro"
```

---

### Task 9: Páginas de catálogo, layout e créditos

**Files:**
- Create: `public/tmdb-logo.svg`, `src/components/CatalogView.tsx`, `src/components/SearchBox.tsx`, `src/components/Footer.tsx`, `src/components/GridSkeleton.tsx`
- Create: `src/app/filmes/page.tsx`, `src/app/filmes/loading.tsx`, `src/app/series/page.tsx`, `src/app/series/loading.tsx`, `src/app/error.tsx`
- Modify (substituir conteúdo): `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Test: `src/components/CatalogView.test.tsx`, `src/components/SearchBox.test.tsx`, `src/components/Footer.test.tsx`

**Interfaces:**
- Consumes: `parseFilters`, `toQueryString`, `RawParams` (Task 1); `discoverTitles`, `listStreamingProviders`, `listGenres` (Task 3); `TypeTabs`, `TitleGrid` (Task 6); `FilterBar` (Task 7); `LoadMore` (Task 8).
- Produces: `CatalogView({ tipo: TitleType; searchParams: RawParams }): Promise<JSX.Element>` (Server Component async); `<SearchBox />` (form GET para `/busca` com campo `q`); `<Footer />`; `<GridSkeleton />`. Rotas `/`, `/filmes`, `/series` funcionando.

- [ ] **Step 1: Baixar o logo do TMDB**

Run:
```bash
curl -L -o public/tmdb-logo.svg "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
head -c 100 public/tmdb-logo.svg
```
Expected: o arquivo começa com `<svg`. Se não começar (URL mudou), baixe manualmente um dos logos em https://www.themoviedb.org/about/logos-attribution e salve como `public/tmdb-logo.svg`.

- [ ] **Step 2: Escrever os testes que falham**

`src/components/CatalogView.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS } from '@/lib/types';
import { makeTitle, netflix } from '../../test/fixtures';

const mocks = vi.hoisted(() => ({
  discoverTitles: vi.fn(),
  listStreamingProviders: vi.fn(),
  listGenres: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/tmdb/catalog', () => ({ discoverTitles: mocks.discoverTitles }));
vi.mock('@/lib/tmdb/providers', () => ({ listStreamingProviders: mocks.listStreamingProviders }));
vi.mock('@/lib/tmdb/genres', () => ({ listGenres: mocks.listGenres }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/filmes',
}));

import { CatalogView } from './CatalogView';

describe('CatalogView', () => {
  beforeEach(() => {
    mocks.discoverTitles.mockReset();
    mocks.listStreamingProviders.mockResolvedValue([netflix]);
    mocks.listGenres.mockResolvedValue([{ id: 35, nome: 'Comédia' }]);
  });

  it('busca a página 1 com os filtros da URL e mostra os títulos', async () => {
    mocks.discoverTitles.mockResolvedValue({ titles: [makeTitle({ titulo: 'Duna' })], page: 1, totalPages: 3 });

    render(await CatalogView({ tipo: 'filme', searchParams: { genero: '35' } }));

    expect(mocks.discoverTitles).toHaveBeenCalledWith('filme', { ...DEFAULT_FILTERS, generos: [35] }, 1);
    expect(screen.getByRole('heading', { name: 'Duna' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comédia' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: 'Filmes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('mostra estado vazio com link para limpar os filtros', async () => {
    mocks.discoverTitles.mockResolvedValue({ titles: [], page: 1, totalPages: 0 });

    render(await CatalogView({ tipo: 'serie', searchParams: { notaMin: '9' } }));

    expect(screen.getByText('Nenhum título encontrado com esses filtros.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Limpar filtros' })).toHaveAttribute('href', '/series');
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).toBeNull();
  });
});
```

`src/components/SearchBox.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SearchBox } from './SearchBox';

describe('SearchBox', () => {
  it('envia o campo q para /busca via GET', () => {
    render(<SearchBox />);
    const input = screen.getByRole('searchbox', { name: 'Buscar filme ou série' });
    expect(input).toHaveAttribute('name', 'q');
    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('action', '/busca');
    expect(form).toHaveAttribute('method', 'get');
  });
});
```

`src/components/Footer.test.tsx`:
```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from './Footer';

describe('Footer', () => {
  it('exibe os créditos exigidos pelo TMDB e pela JustWatch', () => {
    render(<Footer />);
    expect(screen.getByRole('img', { name: 'The Movie Database (TMDB)' })).toBeInTheDocument();
    expect(
      screen.getByText('Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'JustWatch' })).toHaveAttribute('href', 'https://www.justwatch.com');
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- src/components/CatalogView.test.tsx src/components/SearchBox.test.tsx src/components/Footer.test.tsx`
Expected: FAIL — componentes não existem.

- [ ] **Step 4: Implementar os componentes**

`src/components/CatalogView.tsx`:
```tsx
import Link from 'next/link';
import { parseFilters, toQueryString, type RawParams } from '@/lib/filters';
import { discoverTitles } from '@/lib/tmdb/catalog';
import { listGenres } from '@/lib/tmdb/genres';
import { listStreamingProviders } from '@/lib/tmdb/providers';
import { CATALOG_PATHS, type TitleType } from '@/lib/types';
import { FilterBar } from './FilterBar';
import { LoadMore } from './LoadMore';
import { TitleGrid } from './TitleGrid';
import { TypeTabs } from './TypeTabs';

interface CatalogViewProps {
  tipo: TitleType;
  searchParams: RawParams;
}

export async function CatalogView({ tipo, searchParams }: CatalogViewProps) {
  const filters = parseFilters(searchParams);
  const [page, providers, genres] = await Promise.all([
    discoverTitles(tipo, filters, 1),
    listStreamingProviders(tipo),
    listGenres(tipo),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <TypeTabs ativo={tipo} />
      <FilterBar filters={filters} providers={providers} genres={genres} />
      {page.titles.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p>Nenhum título encontrado com esses filtros.</p>
          <Link href={CATALOG_PATHS[tipo]} className="text-sm underline">
            Limpar filtros
          </Link>
        </div>
      ) : (
        <>
          <TitleGrid titles={page.titles} />
          {/* key reinicia os títulos extras quando os filtros mudam */}
          <LoadMore
            key={toQueryString(filters)}
            tipo={tipo}
            filters={filters}
            initialPage={page.page}
            totalPages={page.totalPages}
          />
        </>
      )}
    </div>
  );
}
```

`src/components/SearchBox.tsx`:
```tsx
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
```

`src/components/Footer.tsx`:
```tsx
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
```

`src/components/GridSkeleton.tsx`:
```tsx
export function GridSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    >
      {Array.from({ length: 12 }, (_, index) => (
        <div key={index} className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800" />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- src/components`
Expected: PASS.

- [ ] **Step 6: Escrever layout, rotas, carregamento e erro**

`src/app/globals.css` (substituir tudo):
```css
@import 'tailwindcss';
```

`src/app/layout.tsx` (substituir tudo):
```tsx
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
```

`src/app/page.tsx` (substituir tudo):
```tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/filmes');
}
```

`src/app/filmes/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { CatalogView } from '@/components/CatalogView';

export const metadata: Metadata = { title: 'Filmes em streaming no Brasil' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function FilmesPage({ searchParams }: PageProps) {
  return <CatalogView tipo="filme" searchParams={await searchParams} />;
}
```

`src/app/series/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { CatalogView } from '@/components/CatalogView';

export const metadata: Metadata = { title: 'Séries em streaming no Brasil' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SeriesPage({ searchParams }: PageProps) {
  return <CatalogView tipo="serie" searchParams={await searchParams} />;
}
```

`src/app/filmes/loading.tsx` e `src/app/series/loading.tsx` (mesmo conteúdo nos dois):
```tsx
export { GridSkeleton as default } from '@/components/GridSkeleton';
```

`src/app/error.tsx`:
```tsx
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
```

Apagar os SVGs de exemplo do scaffold que não são usados:
```bash
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 7: Verificar build, testes e lint**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: tudo PASS; o build termina e lista `/filmes` e `/series` como dinâmicas (ƒ). O build não precisa de token porque essas páginas só renderizam sob demanda.

- [ ] **Step 8: Verificação manual com a API real**

Crie `.env.local` com `TMDB_READ_TOKEN=<seu token>` (este arquivo não vai para o git). Run: `npm run dev` e abra http://localhost:3000.
Expected: redireciona para `/filmes`; aparecem pôsteres com logos de streaming; clicar em "Netflix" muda a URL para `?streaming=8` e a grade; "Carregar mais" adiciona 20 títulos; a aba "Séries" funciona. No DevTools, com largura de celular, a grade tem 2 colunas.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: páginas de filmes e séries, layout, rodapé com créditos e telas de carregamento/erro"
```

---

### Task 10: Página de busca

**Files:**
- Create: `src/components/SearchResults.tsx`, `src/app/busca/page.tsx`, `src/app/busca/loading.tsx`
- Test: `src/components/SearchResults.test.tsx`

**Interfaces:**
- Consumes: `searchTitles` (Task 4); `TitleGrid` (Task 6); `GridSkeleton` (Task 9).
- Produces: `SearchResults({ query: string }): Promise<JSX.Element>`; rota `/busca?q=`.

- [ ] **Step 1: Escrever o teste que falha — `src/components/SearchResults.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeTitle, netflix } from '../../test/fixtures';

const { searchTitles } = vi.hoisted(() => ({ searchTitles: vi.fn() }));
vi.mock('@/lib/tmdb/search', () => ({ searchTitles }));

import { SearchResults } from './SearchResults';

describe('SearchResults', () => {
  beforeEach(() => searchTitles.mockReset());

  it('pede um texto quando a busca está vazia, sem chamar a API', async () => {
    render(await SearchResults({ query: '' }));
    expect(screen.getByText('Digite o nome de um filme ou série para buscar.')).toBeInTheDocument();
    expect(searchTitles).not.toHaveBeenCalled();
  });

  it('mostra resultados com streamings e aviso para os indisponíveis', async () => {
    searchTitles.mockResolvedValue([
      makeTitle({ id: 1, titulo: 'Duna', streamings: [netflix] }),
      makeTitle({ id: 2, titulo: 'Duna (1984)', streamings: [] }),
    ]);

    render(await SearchResults({ query: 'duna' }));

    expect(searchTitles).toHaveBeenCalledWith('duna');
    expect(screen.getByRole('heading', { name: 'Resultados para “duna”' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Netflix' })).toBeInTheDocument();
    expect(screen.getByText('Não disponível em streaming no Brasil')).toBeInTheDocument();
  });

  it('avisa quando nada foi encontrado', async () => {
    searchTitles.mockResolvedValue([]);
    render(await SearchResults({ query: 'xyzzy' }));
    expect(screen.getByText('Nenhum título encontrado para “xyzzy”.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- src/components/SearchResults.test.tsx`
Expected: FAIL — não resolve `./SearchResults`.

- [ ] **Step 3: Implementar**

`src/components/SearchResults.tsx`:
```tsx
import { searchTitles } from '@/lib/tmdb/search';
import { TitleGrid } from './TitleGrid';

export async function SearchResults({ query }: { query: string }) {
  if (!query) {
    return <p className="py-16 text-center text-zinc-400">Digite o nome de um filme ou série para buscar.</p>;
  }

  const titles = await searchTitles(query);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Resultados para “{query}”</h1>
      {titles.length === 0 ? (
        <p className="py-16 text-center text-zinc-400">Nenhum título encontrado para “{query}”.</p>
      ) : (
        <TitleGrid titles={titles} showUnavailable />
      )}
    </div>
  );
}
```

`src/app/busca/page.tsx`:
```tsx
import type { Metadata } from 'next';
import { SearchResults } from '@/components/SearchResults';

export const metadata: Metadata = { title: 'Buscar títulos' };

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BuscaPage({ searchParams }: PageProps) {
  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();
  return <SearchResults query={query} />;
}
```

`src/app/busca/loading.tsx`:
```tsx
export { GridSkeleton as default } from '@/components/GridSkeleton';
```

- [ ] **Step 4: Rodar testes, typecheck e build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS; `/busca` aparece como rota dinâmica.

- [ ] **Step 5: Verificação manual**

Com `npm run dev`, digite "duna" no campo de busca do topo e envie.
Expected: vai para `/busca?q=duna`, lista filmes e séries com logos; títulos fora dos streamings mostram "Não disponível em streaming no Brasil".

- [ ] **Step 6: Commit**

```bash
git add src/components/SearchResults.tsx src/components/SearchResults.test.tsx src/app/busca
git commit -m "feat: página de busca por título"
```

---

### Task 11: Testes de ponta a ponta e README

**Files:**
- Create: `e2e/mock-tmdb.mjs`, `playwright.config.ts`, `e2e/catalogo.spec.ts`, `e2e/busca.spec.ts`
- Modify (substituir conteúdo): `README.md`

**Interfaces:**
- Consumes: variável `TMDB_API_BASE_URL` lida por `tmdbFetch` (Task 2); rotas e textos das Tasks 6–10.
- Produces: `npm run test:e2e` rodando o app buildado contra um TMDB falso em `http://localhost:4010/3`.

- [ ] **Step 1: Instalar o navegador do Playwright**

Run: `npx playwright install chromium`
Expected: download concluído.

- [ ] **Step 2: Criar o TMDB falso — `e2e/mock-tmdb.mjs`**

```js
import http from 'node:http';

const port = Number(process.env.MOCK_PORT ?? 4010);

const providers = [
  { provider_id: 8, provider_name: 'Netflix', logo_path: null, display_priority: 1, display_priorities: { BR: 1 } },
  { provider_id: 119, provider_name: 'Prime Video', logo_path: null, display_priority: 2, display_priorities: { BR: 2 } },
];

const movies = [
  { id: 1, title: 'Comédia Teste', release_date: '2021-05-01', vote_average: 7.8, poster_path: null, popularity: 50, genre_ids: [35] },
  { id: 2, title: 'Drama Teste', release_date: '2019-03-10', vote_average: 8.1, poster_path: null, popularity: 40, genre_ids: [18] },
];

// Aparece só na busca: o discover real só devolve títulos que estão em streaming.
const searchOnlyMovies = [
  { id: 3, title: 'Filme Sem Streaming', release_date: '2010-01-01', vote_average: 6, poster_path: null, popularity: 5 },
];

const shows = [
  { id: 10, name: 'Série Teste', first_air_date: '2020-01-01', vote_average: 8.5, poster_path: null, popularity: 60, genre_ids: [18] },
];

const titleProviders = {
  'movie/1': [providers[0]],
  'movie/2': [providers[1]],
  'tv/10': [providers[0]],
};

function page(results) {
  return { page: 1, total_pages: 1, total_results: results.length, results };
}

function byGenre(list, withGenres) {
  if (!withGenres) return list;
  const ids = withGenres.split('|').map(Number);
  return list.filter((item) => item.genre_ids.some((id) => ids.includes(id)));
}

function byProvider(list, media, withProviders) {
  if (!withProviders) return list;
  const ids = withProviders.split('|').map(Number);
  return list.filter((item) => (titleProviders[`${media}/${item.id}`] ?? []).some((p) => ids.includes(p.provider_id)));
}

function matches(text, query) {
  return text.toLowerCase().includes((query ?? '').toLowerCase());
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  if (req.headers.authorization !== 'Bearer e2e-token') return send(401, { status_message: 'token inválido' });

  const path = url.pathname.replace(/^\/3/, '');
  const q = url.searchParams;

  if (path === '/genre/movie/list' || path === '/genre/tv/list') {
    return send(200, { genres: [{ id: 35, name: 'Comédia' }, { id: 18, name: 'Drama' }] });
  }
  if (path === '/watch/providers/movie' || path === '/watch/providers/tv') {
    return send(200, { results: providers });
  }
  if (path === '/discover/movie') {
    return send(200, page(byProvider(byGenre(movies, q.get('with_genres')), 'movie', q.get('with_watch_providers'))));
  }
  if (path === '/discover/tv') {
    return send(200, page(byProvider(byGenre(shows, q.get('with_genres')), 'tv', q.get('with_watch_providers'))));
  }
  if (path === '/search/movie') {
    return send(200, page([...movies, ...searchOnlyMovies].filter((m) => matches(m.title, q.get('query')))));
  }
  if (path === '/search/tv') {
    return send(200, page(shows.filter((s) => matches(s.name, q.get('query')))));
  }
  const match = path.match(/^\/(movie|tv)\/(\d+)\/watch\/providers$/);
  if (match) {
    const flatrate = titleProviders[`${match[1]}/${match[2]}`];
    return send(200, { id: Number(match[2]), results: flatrate ? { BR: { link: '', flatrate } } : {} });
  }
  return send(404, { status_message: 'não encontrado' });
});

server.listen(port, () => console.log(`TMDB falso em http://localhost:${port}`));
```

- [ ] **Step 3: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 4010;
const APP_PORT = 3100;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node e2e/mock-tmdb.mjs',
      port: MOCK_PORT,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npx next start -p ${APP_PORT}`,
      port: APP_PORT,
      timeout: 180_000,
      env: { TMDB_API_BASE_URL: `http://localhost:${MOCK_PORT}/3`, TMDB_READ_TOKEN: 'e2e-token' },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

- [ ] **Step 4: Escrever os testes e2e**

`e2e/catalogo.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('a raiz abre o catálogo de filmes', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/filmes$/);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toBeVisible();
});

test('filtrar por gênero atualiza a URL e a grade', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('group', { name: 'Gêneros' }).getByRole('button', { name: 'Comédia' }).click();
  await expect(page).toHaveURL(/genero=35/);
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toBeVisible();
});

test('filtrar por streaming mostra só o que está nele', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('group', { name: 'Streamings' }).getByRole('button', { name: 'Prime Video' }).click();
  await expect(page).toHaveURL(/streaming=119/);
  await expect(page.getByRole('heading', { name: 'Comédia Teste' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Drama Teste' })).toBeVisible();
});

test('a aba Séries mostra o catálogo de séries', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('link', { name: 'Séries' }).click();
  await expect(page).toHaveURL(/\/series$/);
  await expect(page.getByRole('heading', { name: 'Série Teste' })).toBeVisible();
});
```

`e2e/busca.spec.ts`:
```ts
import { expect, test } from '@playwright/test';

test('buscar um título mostra onde assistir', async ({ page }) => {
  await page.goto('/filmes');
  await page.getByRole('searchbox', { name: 'Buscar filme ou série' }).fill('teste');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await expect(page).toHaveURL(/\/busca\?q=teste/);
  const card = page.getByRole('article', { name: 'Série Teste' });
  await expect(card.getByText('Netflix')).toBeVisible();
});

test('título fora dos streamings aparece com aviso', async ({ page }) => {
  await page.goto('/busca?q=sem%20streaming');
  const card = page.getByRole('article', { name: 'Filme Sem Streaming' });
  await expect(card.getByText('Não disponível em streaming no Brasil')).toBeVisible();
});
```

- [ ] **Step 5: Rodar os testes e2e**

Run: `npm run test:e2e`
Expected: 12 testes PASS (6 cenários × 2 projetos: celular e desktop).

- [ ] **Step 6: Escrever o `README.md`** (substituir o do scaffold)

````markdown
# Catálogo de Streaming

Filmes e séries disponíveis **agora** nos streamings de assinatura no Brasil, com filtros por streaming, gênero, ano e nota, e busca por título. Dados do [TMDB](https://www.themoviedb.org) (disponibilidade via JustWatch).

## Rodando localmente

1. Crie uma conta no TMDB e copie o **API Read Access Token** em https://www.themoviedb.org/settings/api
2. `cp .env.example .env.local` e preencha `TMDB_READ_TOKEN`
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes unitários e de componentes (Vitest) |
| `npm run test:e2e` | testes de ponta a ponta (Playwright, com TMDB falso) |
| `npm run typecheck` | checagem de tipos |
| `npm run lint` | ESLint |
| `npm run build` | build de produção |

## Deploy na Vercel

1. Suba o repositório no GitHub.
2. Em https://vercel.com/new, importe o repositório (a Vercel detecta o Next.js sozinha).
3. Em **Environment Variables**, adicione `TMDB_READ_TOKEN`.
4. Deploy.

## Arquitetura

- `src/lib/tmdb/`: único módulo que conversa com o TMDB (cache via `fetch` do Next).
- `src/lib/filters.ts`: filtros ⇄ URL.
- `src/components/`: interface. `FilterBar` e `LoadMore` são componentes cliente; o resto renderiza no servidor.
- Design completo: `docs/superpowers/specs/2026-09-23-catalogo-streaming-design.md`.
````

- [ ] **Step 7: Rodar a suíte completa**

Run: `npm test && npm run typecheck && npm run lint && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 8: Commit**

```bash
git add e2e playwright.config.ts README.md
git commit -m "test: e2e com TMDB falso + docs: README com setup e deploy"
```
