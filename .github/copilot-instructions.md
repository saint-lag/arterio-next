# Arterio Next — Copilot Instructions

## Stack

- **Framework:** Next.js App Router (v16.1.6) + React 19, TypeScript
- **Cart state:** SWR (`hooks/useCart.ts`) — do **not** migrate to React Query, Zustand, or Context
- **API:** WooCommerce Store API v1 via Next.js proxy (`/api/cart/[...path]/route.ts`)
- **Session:** Stateless guest cart via `Cart-Token` header, persisted in `localStorage`
- **All cart/UI components must be `'use client'`** — the cart is entirely client-side

---

## File Map

| File | Role |
|---|---|
| `app/services/cart.ts` | Core fetcher, token/nonce helpers, all `cartApi.*` methods |
| `app/api/cart/[...path]/route.ts` | Catch-all proxy: forwards headers to WooCommerce, relays `Cart-Token` and `Nonce` back |
| `hooks/useCart.ts` | SWR data-fetching + all cart mutations + debounce + toast + checkout redirect |
| `utils/cartNormalizer.ts` | Transforms raw WC Store API response → typed `CartItem[]` and `total: number` |
| `app/types/woocommerce.ts` | **Canonical** types (`CartItem`, `WCProduct`, `Cart`, `Product`, etc.) |
| `types/woocommerce.ts` | Lighter aliases — some older components import from here; do **not** add new types here |
| `app/providers/SWRProvider.tsx` | Global SWR config (`errorRetryCount: 3`, `dedupingInterval: 2000`) |
| `app/providers/AuthProvider.tsx` | Auth context (independent of cart) |
| `app/config/wordpress.ts` | `WP_CONFIG` — `cartApiUrl`, `checkoutUrl`, `sessionHandoffUrl`, `storeApiUrl` |

---

## Cart-Token: The Session Contract (CRITICAL)

Guest sessions are stateless — identity lives in `localStorage` under the key `arterio_cart_token` (`CART_TOKEN_LS_KEY` in `cart.ts`).

**Rules — enforce these without exception:**

1. The **first** request to `/api/cart/cart` returns `Cart-Token` in the response header → saved automatically by `saveToken()` inside `request()`
2. **Every subsequent request** must include `Cart-Token: <token>` → `cartApi.request()` injects it automatically
3. **Never read `localStorage` outside `useEffect` or outside a `typeof window !== 'undefined'` guard** — causes SSR hydration errors. `getCartToken()` already guards this
4. The **proxy** (`app/api/cart/[...path]/route.ts`) forwards `Cart-Token` from the incoming client header to WooCommerce and relays it back in the response
5. **Stale token recovery** — `useCart`'s SWR `onError` detects 404/410, clears the token via `clearToken()`, and resets the SWR cache to `undefined` silently

---

## Nonce Management

WooCommerce Store API requires a `Nonce` header for all mutating requests (POST/DELETE). The nonce is piggybacked on every response from WC — the proxy relays it and `request()` persists it in `localStorage` via `saveNonce()`.

- The nonce is **automatically injected** by `request()` on every call — no manual handling needed
- If a **401 or 403** is received, `request()` does one automatic retry: fetches a fresh nonce via GET `/cart`, then replays the original request
- The proxy uses `_cb` (timestamp query param) on all requests to bust CDN caches that might serve stale nonces

---

## Cart Mutation Pattern

Every cart action in `useCart.ts` uses `runMutation()`:

```ts
// action() calls the API and receives the FULL updated cart as response
const updatedCart = await action();

// Inject directly into SWR cache — NO re-fetch
await mutate(updatedCart, { revalidate: false });

// On error: force re-fetch to recover real server state
await mutate();
```

**`revalidate: false` is intentional and critical** — prevents a stale background re-fetch from overwriting the fresh API response that was just received.

On error, `runMutation()` always calls `mutate()` (with no arguments) to force a re-fetch and recover the real server state, then surfaces the error via `addToast()`.

---

## Race Condition: Quantity Updates

`updateQuantity` in `useCart.ts` uses **per-item debounce** via `pendingQuantityTimers` (a `useRef<Map<itemKey, timer>>`):

- `QUANTITY_DEBOUNCE_MS = 350` — only the last value is sent after 350ms of inactivity
- If `quantity <= 0`, the item is **removed immediately** (no debounce) — `removeItem` is called, any pending timer for that key is cancelled first
- `removeFromCart` always cancels any pending timer for that item before calling the API

Do **not** remove this debounce — it is the only protection against N simultaneous update requests when the user clicks +/- rapidly.

---

## SWR Configuration

Global config in `SWRProvider.tsx`:
- `revalidateOnFocus: false` (default) — `useCart` overrides this to `true` individually
- `errorRetryCount: 3`
- `dedupingInterval: 2000`

`useCart` SWR options:
- `revalidateOnFocus: true` — re-syncs cart when user returns to the tab
- `revalidateOnReconnect: true` — re-syncs after network recovery
- `keepPreviousData: false`
- `refreshInterval: 0` — no polling

---

## Checkout: Session Handoff → Native WooCommerce

The Next.js app has **no custom `/checkout` page**. When the user clicks "Finalizar Compra", the flow is:

1. `goToCheckout()` in `useCart.ts` sets `isRedirecting = true`
2. `cartApi.redirectToCheckout()` builds a URL to `WP_CONFIG.sessionHandoffUrl` with `?cart_token=<token>&redirect=<checkoutUrl>`
3. `window.location.href` is set to that URL — the WordPress endpoint (`docs/wordpress/session-handoff.php`) decodes the JWT, loads the WC session from DB, sets `wp_wc_session_*` cookies, and redirects to checkout

**WordPress prerequisites:**
```php
// wp-config.php
define('COOKIE_DOMAIN', '.arterio.com.br');
define('COOKIEPATH', '/');
```
Without `COOKIE_DOMAIN`, cookies are scoped to `api.arterio.com.br` only and the user lands on an empty cart.

### What Does NOT Exist (and must not be created)

- `app/checkout/page.tsx` — no custom checkout page
- `app/services/checkout.ts` — no checkout service  
- `app/api/checkout/shipping/` or `app/api/checkout/coupon/` — no shipping/coupon proxies
- `hooks/useCheckout.ts` — no checkout hook
- No POST handler on `/api/checkout`
- No nonce handling separate from the cart nonce flow

---

## Data Normalisation

Raw WooCommerce Store API responses are **never used directly** in UI components. They are always passed through:

- `normalizeCart(serverCart)` → `CartItem[]`
- `normalizeTotal(serverCart)` → `number`

Both helpers live in `utils/cartNormalizer.ts` and handle `currency_minor_unit` correctly (WC returns prices as integers, e.g. `2000` = `20.00` for `minor_unit = 2`).

---

## Types: Canonical Source of Truth

Always add or extend types in **`app/types/woocommerce.ts`** — this is the canonical file.

`types/woocommerce.ts` (root) contains lighter aliases used by older components (`Cart.tsx`, `ProductListing.tsx`). Do **not** add new types there. When touching a component that imports from `@/types/woocommerce`, consider correcting the import path to `@/app/types/woocommerce`.

---

## Product API: Category Filtering

`useProducts` (in `hooks/useProducts.ts`) fetches **all products** and filters client-side by `category` ID. This is **intentional** — there is a WooCommerce Store API bug with the `category` query param.

**Do not** add `?category=<id>` as a query param to any WC fetch — it will produce incorrect or empty results.

---

## SSR / Hydration Rules

- **Never** call `localStorage.getItem/setItem` at the module level or during render — always inside `useEffect` or behind `typeof window === 'undefined'` guards
- `getCartToken()`, `getNonce()`, `saveToken()`, `saveNonce()`, `clearToken()` in `cart.ts` all have this guard — reuse them, do not bypass them
- `useCart` is a client-side hook — it cannot be called in Server Components

---

## Toast Notifications

Cart errors and confirmations use `useToast()` from `hooks/useToast.ts`. The `ToastContainer` component renders toasts. `runMutation()` in `useCart.ts` calls `addToast(message, 'error')` on failure — there is no need to handle errors separately in call sites.

---

## Dos and Don'ts

| Do | Don't |
|---|---|
| Use `cartApi.*` methods for all cart API calls | Fetch `/api/cart/*` or WC Store API directly |
| Use `runMutation()` for all cart state changes | Call `mutate()` directly from components |
| Extend `app/types/woocommerce.ts` for new types | Add types to root `types/woocommerce.ts` |
| Use `normalizeCart()` / `normalizeTotal()` in `useCart` | Read raw server cart data in UI components |
| Guard all `localStorage` access with `typeof window` | Read `localStorage` during SSR/render |
| Keep `revalidate: false` after a successful mutation | Trigger a re-fetch after injecting fresh API response |
| Cancel pending timers before `removeFromCart` | Call remove without cancelling the debounce timer |
| Add cart/UI components as `'use client'` | Use cart hooks in Server Components |