import { NextRequest, NextResponse } from 'next/server';

const WP_STORE_API = `${process.env.NEXT_PUBLIC_WP_URL}/wp-json/wc/store/v1`;

async function proxyTo(request: NextRequest, endpoint: string) {
  const cartToken = request.headers.get('Cart-Token');
  const nonce     = request.headers.get('Nonce') ?? request.headers.get('X-WC-Store-API-Nonce');

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  if (cartToken) headers.set('Cart-Token', cartToken);
  if (nonce)     headers.set('X-WC-Store-API-Nonce', nonce);

  const body = await request.text();

  try {
    const wooRes = await fetch(`${WP_STORE_API}/${endpoint}`, {
      method: 'POST',
      headers,
      body: body || undefined,
    });
    const data = await wooRes.text();

    const resHeaders = new Headers();
    resHeaders.set('Content-Type', 'application/json');

    const newToken = wooRes.headers.get('Cart-Token');
    if (newToken) resHeaders.set('Cart-Token', newToken);

    return new NextResponse(data, { status: wooRes.status, headers: resHeaders });
  } catch (error) {
    console.error('[Coupon API]', error);
    return NextResponse.json({ message: 'Erro ao contactar o servidor.' }, { status: 503 });
  }
}

// POST /api/checkout/coupon/apply
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const endpoint = action === 'remove' ? 'cart/remove-coupon' : 'cart/apply-coupon';
  return proxyTo(request, endpoint);
}