import { NextRequest, NextResponse } from 'next/server';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';

function getAuthToken(request: NextRequest): string | null {
  return request.cookies.get('wp_auth_token')?.value ?? null;
}

function unauthorised() {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
}

/** Obtém o user_id do utilizador autenticado via JWT → /wp/v2/users/me */
async function getUserId(token: string): Promise<number | null> {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const me = await res.json();
  return me.id;
}

// GET /api/account/profile
// → wp-json/wc/v3/customers/<user_id>  (Basic Auth — WC REST API v3)
export async function GET(request: NextRequest) {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    console.error('[Profile] Variáveis de ambiente em falta: WC_CONSUMER_KEY / WC_CONSUMER_SECRET');
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const token = getAuthToken(request);
  if (!token) return unauthorised();

  const userId = await getUserId(token);
  if (!userId) return unauthorised();

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${userId}`, {
    headers: {
      Authorization: WC_AUTH,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? 'Erro ao carregar perfil' },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}

// PUT /api/account/profile
// → wp-json/wc/v3/customers/<user_id>  (Basic Auth — WC REST API v3)
export async function PUT(request: NextRequest) {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const token = getAuthToken(request);
  if (!token) return unauthorised();

  const userId = await getUserId(token);
  if (!userId) return unauthorised();

  const body = await request.json();

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/customers/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: WC_AUTH,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? 'Erro ao atualizar perfil' },
      { status: res.status },
    );
  }
  return NextResponse.json(data);
}
