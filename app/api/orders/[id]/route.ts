import { NextRequest, NextResponse } from 'next/server';
import { extractTracking } from '@/utils/extractTracking';

const WP_URL    = process.env.NEXT_PUBLIC_WP_URL;
const WC_KEY    = process.env.WC_CONSUMER_KEY;
const WC_SECRET = process.env.WC_CONSUMER_SECRET;
const WC_AUTH = (WC_KEY && WC_SECRET)
  ? 'Basic ' + Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')
  : '';

/**
 * GET /api/orders/[id]?key=wc_order_xxxxx
 *
 * Endpoint PÚBLICO para a página de obrigado.
 * Não exige autenticação — a validação é feita pelo `order_key`
 * que o WooCommerce gera e inclui na URL de "order received".
 *
 * Retorna apenas campos seguros (sem dados sensíveis).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!WP_URL || !WC_KEY || !WC_SECRET) {
    return NextResponse.json(
      { error: 'Configuração do servidor incompleta' },
      { status: 500 },
    );
  }

  const { id } = await params;
  const orderKey = request.nextUrl.searchParams.get('key');

  if (!orderKey) {
    return NextResponse.json(
      { error: 'Chave do pedido obrigatória' },
      { status: 400 },
    );
  }

  // Buscar pedido via WC REST API (server-side, com credenciais)
  const res = await fetch(`${WP_URL}/wp-json/wc/v3/orders/${id}`, {
    headers: { Authorization: WC_AUTH },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: 'Pedido não encontrado' },
      { status: 404 },
    );
  }

  const order = await res.json();

  // Validar que a order_key confere — esta é a prova de que o
  // visitante realmente fez o pedido (mesmo sem estar logado)
  if (order.order_key !== orderKey) {
    return NextResponse.json(
      { error: 'Chave do pedido inválida' },
      { status: 403 },
    );
  }

  // Retornar apenas campos seguros para o client-side
  const safe = extractTracking({
    id: order.id,
    number: order.number,
    status: order.status,
    date_created: order.date_created,
    total: order.total,
    currency_symbol: order.currency_symbol,
    payment_method_title: order.payment_method_title,
    billing: {
      first_name: order.billing.first_name,
      last_name: order.billing.last_name,
      email: order.billing.email,
    },
    line_items: (order.line_items ?? []).map((item: Record<string, unknown>) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      total: item.total,
      image: item.image,
    })),
    meta_data: order.meta_data,
  });

  console.log('[Order Detail] Pedido validado:', safe);

  return NextResponse.json(safe);
}
