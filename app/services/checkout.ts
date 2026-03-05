// ─── Checkout Service ─────────────────────────────────────────────────────────
// Gere todas as chamadas durante o checkout headless.
// Reutiliza o Cart-Token do cartService (mesmo localStorage key).
// O Nonce é obtido no GET /checkout e guardado em memória para o POST.
// ──────────────────────────────────────────────────────────────────────────────

import { getCartToken } from '@/app/services/cart';

const CART_TOKEN_LS_KEY = 'arterio_cart_token';
const CHECKOUT_API      = '/api/checkout';

function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_TOKEN_LS_KEY, token);
}

// Nonce em memória — obtido no GET /checkout, enviado no POST /checkout
let _nonce: string | null = null;

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getCartToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token)  headers.set('Cart-Token', token);
  if (_nonce) headers.set('Nonce', _nonce);

  const response = await fetch(`${CHECKOUT_API}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  // Actualiza token se a API devolver um novo
  const newToken = response.headers.get('Cart-Token');
  if (newToken && newToken !== token) saveToken(newToken);

  // Guarda o nonce para requests seguintes (necessário para o POST /checkout)
  const newNonce = response.headers.get('Nonce') ?? response.headers.get('X-WC-Store-API-Nonce');
  if (newNonce) _nonce = newNonce;

  if (!response.ok) {
    const text = await response.text();
    let message = `Erro ${response.status}`;
    try { message = JSON.parse(text)?.message ?? message; } catch { /* fallback */ }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CheckoutAddress {
  first_name: string;
  last_name:  string;
  company?:   string;
  address_1:  string;
  address_2?: string;
  city:       string;
  state:      string;
  postcode:   string;
  country:    string;
  email?:     string;
  phone?:     string;
}

export interface ShippingRate {
  rate_id:             string;
  name:                string;
  price:               string;
  currency_minor_unit: number;
  selected:            boolean;
  method_id:           string;
  instance_id:         number;
}

export interface ShippingPackage {
  package_id:     number;
  name:           string;
  shipping_rates: ShippingRate[];
}

export interface PaymentMethod {
  id:          string;
  title:       string;
  description: string;
}

export interface CheckoutState {
  order_id?:        number;
  status?:          string;
  billing_address:  CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method:   string;
  payment_methods?: PaymentMethod[];
  shipping_rates?:  ShippingPackage[];
  coupons?:         Array<{ code: string }>;
  payment_result?:  { payment_status: string; redirect_url?: string };
  totals?: {
    total_price:         string;
    total_shipping:      string;
    total_discount:      string;
    currency_minor_unit: number;
  };
}

export interface CheckoutPayload {
  billing_address:  CheckoutAddress;
  shipping_address: CheckoutAddress;
  payment_method:   string;
  customer_note?:   string;
  payment_data?:    Array<{ key: string; value: string }>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const checkoutApi = {
  // Obtém estado do checkout + nonce (guardado automaticamente em _nonce)
  getCheckout: (): Promise<CheckoutState> =>
    request<CheckoutState>(''),

  // Submete pedido — usa o _nonce obtido no getCheckout()
  placeOrder: (payload: CheckoutPayload): Promise<CheckoutState> =>
    request<CheckoutState>('', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Métodos de envio
  getShippingRates: (): Promise<ShippingPackage[]> =>
    request<ShippingPackage[]>('/shipping'),

  selectShippingRate: (packageId: number, rateId: string): Promise<unknown> =>
    request('/shipping', {
      method: 'POST',
      body: JSON.stringify({ package_id: packageId, rate_id: rateId }),
    }),

  // Cupões
  applyCoupon: (code: string): Promise<unknown> =>
    request('/coupon/apply', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  removeCoupon: (code: string): Promise<unknown> =>
    request('/coupon/remove', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
};