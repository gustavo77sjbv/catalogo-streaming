# Catálogo de Streaming

Filmes e séries disponíveis **agora** nos streamings de assinatura no Brasil, com filtros por streaming, gênero, ano e nota, e busca por título. Dados do [TMDB](https://www.themoviedb.org) (disponibilidade via JustWatch).

## Rodando localmente

Requer Node.js >= 20.9.

1. Crie uma conta no TMDB e copie o **API Read Access Token** em https://www.themoviedb.org/settings/api
2. `cp .env.example .env.local` e preencha `TMDB_READ_TOKEN`
3. `npm install`
4. `npm run dev` → http://localhost:3000

## Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes unitários e de componentes (Vitest) |
| `npm run test:e2e` | testes de ponta a ponta (Playwright, com TMDB falso) — rode `npx playwright install chromium` uma vez antes |
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
