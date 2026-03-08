// API Route para GET em /api/account/orders
// Retorna a lista de pedidos do utilizador autenticado, com suporte a paginação.
// Busca primeiro por customer_id, depois por billing email (para guest orders).
// Exige autenticação via cookie wp_auth_token (JWT).
import { NextRequest, NextResponse } from 'next/server';

const WP_URL = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';

import { extractTracking } from '@/utils/extractTracking';

function getAuthToken(request: NextRequest): string | null {
  return request.cookies.get('wp_auth_token')?.value ?? null;
}

function missingConfig() {
  const missing: string[] = [];
  if (!WP_URL) missing.push('NEXT_PUBLIC_WP_URL');
  if (!WC_KEY) missing.push('WC_CONSUMER_KEY');
  if (!WC_SECRET) missing.push('WC_CONSUMER_SECRET');
  return missing;
}

// GET /api/account/orders
// → wp-json/wc/v3/orders?customer=<user_id>
// Fallback: se customer_id não retornar resultados, busca por billing email
// (pedidos criados via session-handoff têm customer_id=0)
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
    console.warn('[Orders] Tentativa sem token de autenticação');
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Obtém o user_id + email do utilizador autenticado
  const meRes = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    const meStatus = meRes.status;
    console.error(`[Orders] JWT inválido ou expirado (status ${meStatus})`);
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const me = await meRes.json();
  const userId = me.id;
  const userEmail = me.email;

  const url = new URL(request.url);
  const page = url.searchParams.get('page') ?? '1';
  const perPage = 100; // buscar muitos de uma vez, para depois paginar manualmente


  const [byIdRes, byEmailRes] = await Promise.all([
    fetch(`${WP_URL}/wp-json/wc/v3/orders?customer=${userId}&page=${page}&per_page=${perPage}&orderby=date&order=desc`, {
      headers: { Authorization: WC_AUTH },
    }),
    fetch(`${WP_URL}/wp-json/wc/v3/orders?search=${encodeURIComponent(userEmail)}&page=${page}&per_page=${perPage}&orderby=date&order=desc`, {
      headers: { Authorization: WC_AUTH },
    }),
  ]);

  if (!byIdRes.ok && !byEmailRes.ok) {
    console.error(`[Orders] Ambas falharam, Erro WC API: byId status=${byIdRes.status}, byEmail status=${byEmailRes.status}`);
    return NextResponse.json(
      { error: 'Erro ao carregar pedidos' },
      { status: 500 },
    );
  }

  const byIdOrders: Record<string, unknown>[] = byIdRes.ok ? await byIdRes.json() : [];

  // Filtrar resultados por email, para evitar falsos positivos na busca por email

  const byEmailRaw: Record<string, unknown>[] = byEmailRes.ok ? await byEmailRes.json() : [];
  const byEmailOrders = byEmailRaw.filter(order => {
    const billing = order.billing as { email?: string } | undefined;
    return billing?.email?.toLowerCase() === userEmail.toLowerCase();
  });

  console.log(`[Orders] Pedidos encontrados: byId=${byIdOrders.length}, byEmail=${byEmailOrders.length} (após filtro)`);

  // Combinar resultados, removendo duplicados (pedidos que têm customer_id mas também correspondem no email)
  const merged = [...byIdOrders, ...byEmailOrders];
  const deduped = [...new Map(merged.map(o => [o.id, o])).values()]
    .sort((a, b) => {
      const dateA = new Date(a.date_created as string).getTime();
      const dateB = new Date(b.date_created as string).getTime();
      return dateB - dateA; // mais recentes primeiro
    });

    // Paginar resultados manualmente (porque combinamos duas fontes)
    const pageNum = parseInt(page, 10);
    const perPageNum = parseInt(perPage.toString(), 10);
    const start = (pageNum - 1) * perPageNum;
    const paginated = deduped.slice(start, start + perPageNum);
    const totalPagesCalc = Math.ceil(deduped.length / perPageNum).toString();

    const orders = paginated.map(extractTracking);

    console.log(`[Orders] Retornando página ${pageNum} com ${orders.length} pedidos (total ${deduped.length}, total_pages=${totalPagesCalc})`);

    console.log(`[Orders] Pedidos nesta página: ${orders.map(o => `#${o.id} (${o.status})`).join(', ')}`);

  return NextResponse.json(
    { orders, total_pages: totalPagesCalc },
    {
      headers: {
        'X-WP-Total-Pages': totalPagesCalc,
      },
    },
  );
}
