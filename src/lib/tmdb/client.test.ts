import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { server, TMDB, useMsw } from '../../../test/msw';
import { TmdbError, tmdbFetch } from './client';

// eslint-disable-next-line react-hooks/rules-of-hooks
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
