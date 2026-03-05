import { NextRequest, NextResponse } from 'next/server';

const WP_STORE_API = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wc/store/v1`;

async function proxyTo(request: NextRequest, endpoint: string) {
  const cartToken = request.headers.get('Cart-Token');
  const nonce     = request.headers.get('Nonce') ?? request.headers.get('X-WC-Store-API-Nonce');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cartToken) headers.set('Cart-Token', cartToken);
  if (nonce)     headers.set('X-WC-Store-API-Nonce', nonce);

  const init: RequestInit = { method: request.method, headers };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
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

    return new NextResponse(data, { status: wooRes.status, headers: resHeaders });
  } catch (error) {
    console.error('[Checkout sub-route]', error);
    return NextResponse.json({ message: 'Erro ao contactar o servidor.' }, { status: 503 });
  }
}

// GET /api/checkout/shipping → taxas de envio disponíveis
export async function GET(request: NextRequest) {
  return proxyTo(request, 'cart/shipping-rates');
}

// POST /api/checkout/shipping → seleccionar taxa de envio
export async function POST(request: NextRequest) {
  return proxyTo(request, 'cart/select-shipping-rate');
}