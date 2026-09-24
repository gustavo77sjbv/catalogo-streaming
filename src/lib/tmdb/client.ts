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
