import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;

/**
 * GET /api/pages/[slug]
 * Busca uma página do WordPress pelo slug.
 * Exemplo: GET /api/pages/privacy → busca a página com slug "privacy"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!WP_URL) {
    return NextResponse.json(
      { error: 'WordPress URL não configurado' },
      { status: 500 }
    );
  }

  try {
    // WP REST API v2 - buscar página por slug
    const response = await fetch(
      `${WP_URL}/wp-json/wp/v2/pages?slug=${encodeURIComponent(slug)}`,
      {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Erro ao buscar página: ${response.status}` },
        { status: response.status }
      );
    }

    const pages = await response.json();

    // A API retorna array - se não encontrar, retorna []
    if (!pages || pages.length === 0) {
      return NextResponse.json(
        { error: 'Página não encontrada' },
        { status: 404 }
      );
    }

    // Retorna a primeira página encontrada
    const page = pages[0];
    return NextResponse.json({
      id: page.id,
      title: page.title?.rendered || '',
      content: page.content?.rendered || '',
      slug: page.slug,
      date: page.date,
      modified: page.modified,
    });
  } catch (error) {
    console.error('[Pages API] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar página' },
      { status: 500 }
    );
  }
}
