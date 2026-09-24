# Catálogo de Streaming — Design (v1)

**Data:** 2026-09-23
**Status:** aguardando revisão

## 1. Objetivo

Web app que mostra os filmes e séries disponíveis **agora** nos streamings de assinatura no **Brasil**, usando a API do TMDB.

- **Propósito:** projeto de estudo/portfólio (código organizado e testado) que também será usado de verdade para decidir o que assistir.
- **Critério de sucesso:** no celular, o usuário filtra algo como "comédias na Netflix ou Prime com nota ≥ 7" e encontra o que assistir em poucos segundos.

## 2. Escopo

### v1 (este spec)
- Filmes **e** séries, em abas separadas.
- Apenas Brasil (`watch_region=BR`), apenas assinatura (`with_watch_monetization_types=flatrate`).
- Navegar pelo catálogo de um ou mais streamings.
- Filtrar por gênero, faixa de ano e nota mínima; ordenar por popularidade, nota ou lançamento.
- Buscar por título e ver em quais streamings está.
- Interface e dados em português (`language=pt-BR`).
- Sem login, sem banco de dados.

### Fora da v1
- Página de detalhes do título.
- Login e listas pessoais (favoritos, já assistidos) → **v2**.
- Outros países, aluguel/compra, streamings gratuitos com anúncio.

### Preparação para v2
A v2 adicionará autenticação e listas do usuário em um banco próprio (ex.: Supabase), em módulos novos `lib/auth/` e `lib/db/`. O catálogo continua vindo do TMDB; `lib/tmdb/` não muda. Nada da v2 é implementado agora.

## 3. Stack

| Item | Escolha |
|---|---|
| Framework | Next.js (App Router) + React + TypeScript (`strict`) |
| Estilo | Tailwind CSS, tema escuro por padrão |
| Validação | Zod |
| Testes | Vitest, MSW, React Testing Library, Playwright |
| Qualidade | ESLint + Prettier |
| Deploy | Vercel |

## 4. Telas e navegação

### Rotas
| Rota | Conteúdo |
|---|---|
| `/` | redireciona para `/filmes` |
| `/filmes` | catálogo de filmes |
| `/series` | catálogo de séries |
| `/busca?q=...` | resultados de busca (filmes + séries) |
| `/api/titles` | JSON para o "Carregar mais" |

### Tela de catálogo (de cima para baixo)
1. **Cabeçalho:** nome do app, abas Filmes | Séries, campo de busca.
2. **Chips de streaming** com logo. Mostra os ~10 principais (ordenados por `display_priority` do TMDB para BR) e um botão "ver mais" que exibe os demais.
   - Nenhum selecionado → tudo que está em qualquer streaming de assinatura no BR.
   - Vários selecionados → regra **OU** (título aparece se estiver em pelo menos um).
3. **Filtros:** gêneros (múltiplos, regra OU), ano de/até, nota mínima (0–10), ordenação (popularidade [padrão], nota, lançamento mais recente).
4. **Grade de cards:** pôster, título, ano, nota, logos dos streamings em que o título está no BR. 2 colunas no celular, até 6 no desktop.
5. **Botão "Carregar mais":** próxima página de 20 títulos.

### Estado na URL
Todos os filtros ficam na query string, ex.: `/filmes?streaming=8,119&genero=35&anoDe=2010&anoAte=2024&notaMin=7&ordem=nota`.
Parâmetros: `streaming` (IDs de provider, separados por vírgula), `genero` (IDs de gênero, separados por vírgula), `anoDe`, `anoAte`, `notaMin`, `ordem` (`popularidade` | `nota` | `lancamento`).

### Busca
- Consulta filmes e séries e mostra os resultados juntos.
- **Ignora os filtros do catálogo**, porque o endpoint de busca do TMDB não aceita filtro por provider.
- Cada resultado mostra os streamings de assinatura no BR. Os que não estão em nenhum aparecem com o aviso "Não disponível em streaming no Brasil".

### Estados de tela
- Carregando: esqueleto da grade.
- Vazio: "Nenhum título encontrado com esses filtros" + botão "Limpar filtros".
- Erro: mensagem + botão "Tentar de novo".

### Créditos obrigatórios
O rodapé mostra o logo do TMDB, o aviso de que o produto não é endossado pelo TMDB e o crédito "dados de streaming por JustWatch".

## 5. Arquitetura

### Estrutura
```
src/
  app/
    page.tsx                 redirect → /filmes
    filmes/page.tsx          Server Component
    series/page.tsx          Server Component
    busca/page.tsx           Server Component
    api/titles/route.ts      Route Handler (JSON)
    error.tsx                tela de erro
  lib/
    tmdb/
      client.ts              fetch autenticado, pt-BR, erros, cache
      catalog.ts             discoverTitles(tipo, filtros, pagina)
      search.ts              searchTitles(texto)
      providers.ts           listStreamingProviders(tipo), getTitleProviders(tipo, id)
      genres.ts              listGenres(tipo)
      mappers.ts             formato TMDB → tipos internos
    filters.ts               parseFilters(searchParams) / serializeFilters(filters)
    types.ts                 Title, Provider, Genre, Filters, TitleType
  components/
    TitleCard, TitleGrid, ProviderChips, FilterBar, SearchBox, TypeTabs, LoadMore
```

### Responsabilidades
- **`lib/tmdb/`** é o **único** módulo que conversa com o TMDB. Importa `server-only`, e o resto do app recebe só os tipos internos.
- **`filters.ts`** é lógica pura: converte URL ⇄ `Filters`, valida com Zod e troca valores inválidos pelo padrão.
- **Componentes** apenas renderizam e disparam mudanças de URL; não conhecem o TMDB.

### Tipos internos
```ts
type TitleType = 'filme' | 'serie';

interface Provider { id: number; nome: string; logoUrl: string; }

interface Title {
  id: number;
  tipo: TitleType;
  titulo: string;
  ano: number | null;
  nota: number;            // vote_average, 0–10
  posterUrl: string | null;
  streamings: Provider[];  // apenas flatrate no BR
}

interface Filters {
  streamings: number[];
  generos: number[];
  anoDe: number | null;
  anoAte: number | null;
  notaMin: number | null;
  ordem: 'popularidade' | 'nota' | 'lancamento';
}
```
`mappers.ts` unifica os campos: filmes usam `title` e `release_date`, séries usam `name` e `first_air_date`.

### Mapeamento para o TMDB
| Nosso | `/discover/movie` | `/discover/tv` |
|---|---|---|
| streamings (OU) | `with_watch_providers=8\|119` | idem |
| região/tipo | `watch_region=BR&with_watch_monetization_types=flatrate` | idem |
| gêneros (OU) | `with_genres=35\|18` | idem |
| anoDe | `primary_release_date.gte=AAAA-01-01` | `first_air_date.gte=AAAA-01-01` |
| anoAte | `primary_release_date.lte=AAAA-12-31` | `first_air_date.lte=AAAA-12-31` |
| notaMin | `vote_average.gte=N` | idem |
| ordem popularidade | `sort_by=popularity.desc` | idem |
| ordem nota | `sort_by=vote_average.desc` + `vote_count.gte=200` | idem |
| ordem lançamento | `sort_by=primary_release_date.desc` | `sort_by=first_air_date.desc` |

O `vote_count.gte=200` na ordenação por nota evita que títulos com pouquíssimos votos dominem o topo. Na ordenação por lançamento, também se aplica `primary_release_date.lte` / `first_air_date.lte` = hoje, para não listar títulos futuros.

Outros endpoints: `/search/movie` e `/search/tv` (busca), `/{movie|tv}/{id}/watch/providers` (streamings do título, lendo `results.BR.flatrate`), `/watch/providers/{movie|tv}?watch_region=BR` (lista de streamings), `/genre/{movie|tv}/list` (gêneros).

### Fluxo de dados
1. Uma página de catálogo recebe `searchParams`, e `parseFilters` gera `Filters`.
2. `discoverTitles` chama `/discover/*` (página 1).
3. `getTitleProviders` roda em paralelo (`Promise.allSettled`) para os 20 resultados.
4. O HTML é renderizado no servidor.
5. **Mudar um filtro:** um componente cliente chama `router.push` com a nova URL, e a página é renderizada de novo no servidor.
6. **Carregar mais:** o cliente chama `/api/titles?tipo=filme&page=N&<filtros>`, o handler reaproveita `parseFilters` + `discoverTitles` e devolve `{ titles, page, totalPages }`, e o cliente anexa os cards.
7. **Busca:** `searchTitles` chama `/search/movie` e `/search/tv` em paralelo, intercala os resultados pela popularidade e busca os streamings de cada um. Mostra só a primeira página (até 20 resultados combinados), sem "Carregar mais".

### Cache (`fetch` com `next.revalidate`)
| Dado | Validade |
|---|---|
| Gêneros, lista de streamings | 7 dias |
| Resultados de discover | 6 horas |
| Streamings de um título | 24 horas |
| Busca | 1 hora |

### Configuração
- `TMDB_READ_TOKEN`: token de leitura (v4) do TMDB, usado como `Authorization: Bearer`. Só no servidor. Um `.env.example` documenta a variável.
- `next.config`: `images.remotePatterns` para `image.tmdb.org`.

## 6. Tratamento de erros

- **`client.ts`** converte falhas em `TmdbError` com `kind`:
  - `unauthorized` (401): token inválido, registrado no log de forma explícita.
  - `rate_limited` (429): uma nova tentativa após a espera indicada em `Retry-After` (ou 1s); se falhar de novo, propaga o erro.
  - `unavailable` (5xx ou falha de rede).
  - `not_found` (404).
- **Página:** erros propagam para `error.tsx` ("Não conseguimos carregar o catálogo" + tentar de novo).
- **Falha parcial:** se `getTitleProviders` falhar para um título, o card aparece com `streamings: []`. A página não quebra.
- **URL inválida:** o parâmetro inválido é ignorado e o padrão entra no lugar. Se `anoDe > anoAte`, os valores são trocados.
- **Carregar mais:** em caso de falha, uma mensagem aparece junto ao botão, os cards existentes permanecem e o botão permite tentar de novo.
- **Imagem ausente:** um placeholder mostra o título.

## 7. Testes

Desenvolvimento em **TDD**.

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Lógica pura | Vitest | `filters.ts` (parse/serialize, inválidos, anoDe > anoAte), `mappers.ts` (filme e série → `Title`), montagem dos parâmetros de discover |
| Integração TMDB | Vitest + MSW | funções de `lib/tmdb/`, tratamento de 401/404/429/5xx, falha parcial de providers |
| Componentes | React Testing Library | `FilterBar` e `ProviderChips` atualizando a URL, `LoadMore` (carregando, erro, anexar), estados vazio e erro |
| Ponta a ponta | Playwright (TMDB simulado) | abrir catálogo → aplicar filtro → resultados; buscar título → ver streamings |

Nenhum teste chama a API real do TMDB.

## 8. Pré-requisitos

- Conta no TMDB e token de leitura da API.
- Node.js LTS.
- Conta na Vercel (para o deploy).
