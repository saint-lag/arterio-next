import { NextRequest, NextResponse } from 'next/server';

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

  return NextResponse.json(data);
}
