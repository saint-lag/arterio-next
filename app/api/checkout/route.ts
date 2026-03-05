import { NextRequest, NextResponse } from 'next/server';

const WP_STORE_API = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wc/store/v1`;

async function proxyCheckout(request: NextRequest, endpoint: string) {
  const cartToken = request.headers.get('Cart-Token');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cartToken) headers.set('Cart-Token', cartToken);

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

    // Nonce devolvido pelo WooCommerce — o cliente deve guardá-lo e reenviá-lo no POST
    const nonce = wooRes.headers.get('Nonce') ?? wooRes.headers.get('X-WC-Store-API-Nonce');
    if (nonce) resHeaders.set('Nonce', nonce);

    return new NextResponse(data, { status: wooRes.status, headers: resHeaders });
  } catch (error) {
    console.error('[Checkout API]', error);
    return NextResponse.json({ message: 'Erro ao contactar o servidor.' }, { status: 503 });
  }
}

// GET /api/checkout → lê estado do checkout (inclui nonce no response header)
export async function GET(request: NextRequest) {
  return proxyCheckout(request, 'checkout');
}

// POST /api/checkout → submete pedido
export async function POST(request: NextRequest) {
  return proxyCheckout(request, 'checkout');
}