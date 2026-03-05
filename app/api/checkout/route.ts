import { NextRequest, NextResponse } from 'next/server';

const WP_STORE_API = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wc/store/v1`;

async function proxyCheckout(request: NextRequest, endpoint: string) {
  const cartToken = request.headers.get('Cart-Token');
  // FIX: ler o nonce enviado pelo cliente (guardado em memória no checkoutApi)
  // O WooCommerce exige X-WC-Store-API-Nonce no POST /checkout — sem ele, rejeita o pedido.
  const nonce = request.headers.get('Nonce') ?? request.headers.get('X-WC-Store-API-Nonce');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cartToken) headers.set('Cart-Token', cartToken);
  // FIX: reencaminhar o nonce para o WooCommerce com o header correto
  if (nonce) headers.set('X-WC-Store-API-Nonce', nonce);

  const init: RequestInit = { method: request.method, headers };

  if (request.method === 'POST') {
    const body = await request.text();
    if (body) init.body = body;
  }

  try {
    const wooRes = await fetch(`${WP_STORE_API}/${endpoint}`, init);
    const data   = await wooRes.text();

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', 'application/json');

    const newToken = wooRes.headers.get('Cart-Token');
    if (newToken) resHeaders.set('Cart-Token', newToken);

    // Nonce devolvido pelo WooCommerce no GET — o cliente guarda-o e reenvia-o no POST
    const resNonce = wooRes.headers.get('Nonce') ?? wooRes.headers.get('X-WC-Store-API-Nonce');
    if (resNonce) resHeaders.set('Nonce', resNonce);

    return new NextResponse(data, { status: wooRes.status, headers: resHeaders });
  } catch (error) {
    console.error('[Checkout API]', error);
    return NextResponse.json({ message: 'Erro ao contactar o servidor.' }, { status: 503 });
  }
}

// GET /api/checkout → lê estado do checkout (devolve nonce no response header)
export async function GET(request: NextRequest) {
  return proxyCheckout(request, 'checkout');
}

// POST /api/checkout → submete pedido (exige Cart-Token + X-WC-Store-API-Nonce)
export async function POST(request: NextRequest) {
  return proxyCheckout(request, 'checkout');
}