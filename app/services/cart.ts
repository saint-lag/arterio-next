// ─── Cart Service ─────────────────────────────────────────────────────────────
// Comunica com a WooCommerce Store API via proxy Next.js.
// O Cart-Token vive no localStorage e é injectado como header em cada request.
// O checkout é tratado internamente pelo Next.js (/checkout).
// ──────────────────────────────────────────────────────────────────────────────

export const CART_TOKEN_LS_KEY = 'arterio_cart_token'; // exportado para o checkoutApi reutilizar
const CART_API_BASE = '/api/cart';

// ─── Token ────────────────────────────────────────────────────────────────────

export function getCartToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CART_TOKEN_LS_KEY);
}

function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CART_TOKEN_LS_KEY, token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CART_TOKEN_LS_KEY);
}

// ─── Core fetcher ─────────────────────────────────────────────────────────────

async function request<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getCartToken();

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Cart-Token', token);

  const response = await fetch(`${CART_API_BASE}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });

  const newToken = response.headers.get('Cart-Token');
  if (newToken && newToken !== token) saveToken(newToken);

  if (!response.ok) {
    const text = await response.text();
    let message = `Erro ${response.status}`;
    try { message = JSON.parse(text)?.message ?? message; } catch { /* fallback */ }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const cartApi = {
  fetcher: (): Promise<unknown> => request('/cart'),

  addItem: (productId: number | string, quantity: number, variationId?: number) =>
    request('/cart/add-item', {
      method: 'POST',
      body: JSON.stringify({
        id: productId,
        quantity,
        ...(variationId ? { variation_id: variationId } : {}),
      }),
    }),

  updateItem: (key: string, quantity: number) =>
    request('/cart/update-item', {
      method: 'POST',
      body: JSON.stringify({ key, quantity }),
    }),

  removeItem: (key: string) =>
    request('/cart/remove-item', {
      method: 'POST',
      body: JSON.stringify({ key }),
    }),

  clearToken,

  redirectToCheckout: () => {
    // Checkout interno — sem redirect cross-domain
    window.location.href = '/checkout';
  },
};