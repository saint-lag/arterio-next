// API Route para GET e PUT em /api/account/orders/[id]
// GET: retorna detalhes de um pedido específico (apenas campos seguros)
// PUT: permite cancelar um pedido (status → "cancelled") se estiver num estado cancelável

import { NextRequest, NextResponse } from 'next/server';
import { extractTracking } from '@/utils/extractTracking';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';


// ── Helpers reutilizados por GET e PUT ────────────────────────────────────────

/**
 * Autentica o utilizador via JWT, busca o pedido, e verifica autorização.
 *
 * Autorização aceita DUAS condições (OR):
 *   1. order.customer_id === user.id  (pedido criado por utilizador registado)
 *   2. order.billing.email === user.email  (guest checkout via session-handoff)
 *
 * Retorna { order, user } ou NextResponse de erro.
 */
async function authenticateAndAuthorize(
  request: NextRequest,
  orderId: string,
): Promise<{ order: Record<string, unknown>; user: { id: number; email: string } } | NextResponse> {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    console.error(`[Order ${orderId}] Configuração incompleta`);
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const token = request.cookies.get('wp_auth_token')?.value;
  if (!token) {
    console.warn(`[Order ${orderId}] Tentativa sem token`);
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Identificar utilizador via JWT
  const meRes = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    console.error(`[Order ${orderId}] JWT inválido (status ${meRes.status})`);
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const me = await meRes.json();
  const user = { id: me.id as number, email: (me.email as string) ?? '' };
  console.log(`[Order ${orderId}] Auth: user_id=${user.id}, email=${user.email}`);

  // Buscar pedido no WooCommerce
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: WC_AUTH },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`[Order ${orderId}] WC API erro: status=${res.status}, msg=${data.message ?? '?'}`);
    return NextResponse.json(
      { error: data.message ?? 'Pedido não encontrado' },
      { status: res.status },
    );
  }

  // Autorização: customer_id match OU billing email match
  const orderCustomerId = data.customer_id as number;
  const orderBillingEmail = ((data.billing as { email?: string })?.email ?? '').toLowerCase();
  const userEmailLower = user.email.toLowerCase();

  const isOwnerById = orderCustomerId !== 0 && orderCustomerId === user.id;
  const isOwnerByEmail = orderBillingEmail !== '' && orderBillingEmail === userEmailLower;

  console.log(`[Order ${orderId}] Autorização: customer_id=${orderCustomerId}, billing_email=${orderBillingEmail}, isOwnerById=${isOwnerById}, isOwnerByEmail=${isOwnerByEmail}`);

  if (!isOwnerById && !isOwnerByEmail) {
    console.warn(`[Order ${orderId}] Acesso negado para user ${user.id} (${user.email})`);
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  return { order: data, user };
}


// GET /api/account/orders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log(`[Order ${id}] GET request`);

  const result = await authenticateAndAuthorize(request, id);
  if (result instanceof NextResponse) return result;

  const { order, user } = result;
  console.log(`[Order ${id}] Devolvendo dados para user ${user.id}`);
  return NextResponse.json(extractTracking(order));
}


// PUT /api/account/orders/[id]
// Body: { status: "cancelled" }
// Apenas permite cancelar pedidos em estados cancellable.
const CANCELLABLE_STATUSES = ['pending', 'processing', 'on-hold'];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  console.log(`[Order ${id}] PUT request (cancelamento)`);

  const result = await authenticateAndAuthorize(request, id);
  if (result instanceof NextResponse) return result;

  const { order, user } = result;

  // Validar body
  const body = await request.json().catch(() => null);
  if (!body || body.status !== 'cancelled') {
    console.warn(`[Order ${id}] Body inválido: ${JSON.stringify(body)}`);
    return NextResponse.json(
      { error: 'Apenas status "cancelled" é permitido' },
      { status: 400 },
    );
  }

  // Verificar se o pedido pode ser cancelado
  const currentStatus = order.status as string;
  if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
    console.warn(`[Order ${id}] Não cancelável: status actual=${currentStatus}`);
    return NextResponse.json(
      { error: 'Este pedido não pode mais ser cancelado' },
      { status: 422 },
    );
  }

  // Atualizar status no WooCommerce
  console.log(`[Order ${id}] Cancelando (status actual: ${currentStatus}) por user ${user.id}`);
  const updateRes = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: WC_AUTH,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  });

  const updated = await updateRes.json();
  if (!updateRes.ok) {
    console.error(`[Order ${id}] Erro ao cancelar: status=${updateRes.status}, msg=${updated.message ?? '?'}`);
    return NextResponse.json(
      { error: updated.message ?? 'Erro ao cancelar pedido' },
      { status: updateRes.status },
    );
  }

  console.log(`[Order ${id}] Cancelado com sucesso`);
  return NextResponse.json(extractTracking(updated));
}
