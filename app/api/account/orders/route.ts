import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';

function getAuthToken(request: NextRequest): string | null {
  return request.cookies.get('wp_auth_token')?.value ?? null;
}

function missingConfig() {
  const missing: string[] = [];
  if (!WP_URL)    missing.push('NEXT_PUBLIC_WP_URL');
  if (!WC_KEY)    missing.push('WC_CONSUMER_KEY');
  if (!WC_SECRET) missing.push('WC_CONSUMER_SECRET');
  return missing;
}

// GET /api/account/orders
// → wp-json/wc/v3/orders?customer=<user_id>
export async function GET(request: NextRequest) {
  const missing = missingConfig();
  if (missing.length > 0) {
    console.error(`[Orders] Variáveis de ambiente em falta: ${missing.join(', ')}`);
    return NextResponse.json(
      { error: `Configuração do servidor incompleta (${missing.join(', ')})` },
      { status: 500 },
    );
  }

  const token = getAuthToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Obtém o user_id do utilizador autenticado
  const meRes = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const me = await meRes.json();

  const url = new URL(request.url);
  const page    = url.searchParams.get('page') ?? '1';
  const perPage = url.searchParams.get('per_page') ?? '10';

  const res = await fetch(
    `${WP_URL}/wp-json/wc/v3/orders?customer=${me.id}&page=${page}&per_page=${perPage}&orderby=date&order=desc`,
    { headers: { Authorization: WC_AUTH } },
  );

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? 'Erro ao carregar pedidos' },
      { status: res.status },
    );
  }

  const totalPages = res.headers.get('X-WP-TotalPages') ?? '1';
  return NextResponse.json(data, {
    headers: { 'X-WP-TotalPages': totalPages },
  });
}
