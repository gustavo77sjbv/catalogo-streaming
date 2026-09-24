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
