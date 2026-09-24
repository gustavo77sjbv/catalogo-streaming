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
