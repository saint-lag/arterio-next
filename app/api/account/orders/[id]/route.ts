import { NextRequest, NextResponse } from 'next/server';
import { extractTracking } from '@/utils/extractTracking';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';


// GET /api/account/orders/[id]
// Valida que o pedido pertence ao utilizador autenticado antes de devolver.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    console.error('[Order Detail] Variáveis de ambiente em falta: WC_CONSUMER_KEY / WC_CONSUMER_SECRET');
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const token = request.cookies.get('wp_auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { id } = await params;

  // Verificar que o utilizador autenticado é dono do pedido
  const meRes = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const me = await meRes.json();

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${id}`, {
    headers: { Authorization: WC_AUTH },
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? 'Pedido não encontrado' },
      { status: res.status },
    );
  }

  // Segurança: garante que o pedido pertence ao utilizador
  if (data.customer_id !== me.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  return NextResponse.json(extractTracking(data));
}

// ── Helpers reutilizados por GET e PUT ────────────────────────────────────────

async function authenticateAndAuthorize(
  request: NextRequest,
  orderId: string,
): Promise<{ order: Record<string, unknown> } | NextResponse> {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const token = request.cookies.get('wp_auth_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const meRes = await fetch(`${WP_URL}/wp-json/wp/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const me = await meRes.json();

  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: WC_AUTH },
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data.message ?? 'Pedido não encontrado' },
      { status: res.status },
    );
  }

  if (data.customer_id !== me.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }

  return { order: data };
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
  const result = await authenticateAndAuthorize(request, id);

  if (result instanceof NextResponse) return result;

  const { order } = result;

  // Validar body
  const body = await request.json().catch(() => null);
  if (!body || body.status !== 'cancelled') {
    return NextResponse.json(
      { error: 'Apenas status "cancelled" é permitido' },
      { status: 400 },
    );
  }

  // Verificar se o pedido pode ser cancelado
  if (!CANCELLABLE_STATUSES.includes(order.status as string)) {
    return NextResponse.json(
      { error: 'Este pedido não pode mais ser cancelado' },
      { status: 422 },
    );
  }

  // Atualizar status no WooCommerce
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
    return NextResponse.json(
      { error: updated.message ?? 'Erro ao cancelar pedido' },
      { status: updateRes.status },
    );
  }

  return NextResponse.json(extractTracking(updated));
}
