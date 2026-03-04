'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cartService } from '@/app/services/cart';
import type { CartItem, Product } from '@/app/types/woocommerce';
import { useToast } from '@/hooks/useToast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseServerCart(serverCart: unknown): CartItem[] {
  const cart = serverCart as any;
  if (!cart?.items?.length) return [];

  if (cart.errors?.length) {
    console.warn('[useCart] Avisos do servidor:', cart.errors);
  }

  return cart.items.map((item: any): CartItem => {
    const minorUnit: number = item.prices?.currency_minor_unit ?? 2;
    const divisor = Math.pow(10, minorUnit);
    const imageUrl: string = item.images?.[0]?.src ?? '';

    return {
      key: item.key,
      product_id: item.id,
      variation_id: item.variation_id ?? undefined,
      quantity: item.quantity,
      product: {
        id: item.id.toString(),
        name: item.name,
        price: item.prices?.price
          ? (item.prices.price / divisor).toFixed(2)
          : '0.00',
        image: imageUrl,
      } as any,
      subtotal: item.totals?.line_subtotal
        ? (item.totals.line_subtotal / divisor).toFixed(2)
        : '0.00',
      total: item.totals?.line_total
        ? (item.totals.line_total / divisor).toFixed(2)
        : '0.00',
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // FIX 🟡 — contador de operações em curso em vez de boolean partilhado
  // Garante que isUpdating só vai a false quando TODAS as ops terminarem
  const pendingOps = useRef(0);
  const [isUpdating, setIsUpdating] = useState(false);

  // FIX 🔴 — AbortController por operação de updateQuantity para cancelar
  // requests antigos quando o utilizador clica rapidamente
  const updateAbortRef = useRef<Record<string, AbortController>>({});

  const hasFetchedInitialCart = useRef(false);
  const { toasts, addToast, removeToast } = useToast();

  // ── Helpers de pending ops ─────────────────────────────────────────────────

  function beginOp() {
    pendingOps.current += 1;
    setIsUpdating(true);
  }

  function endOp() {
    pendingOps.current = Math.max(0, pendingOps.current - 1);
    if (pendingOps.current === 0) setIsUpdating(false);
  }

  // ── Sincronização ──────────────────────────────────────────────────────────

  const syncWithServer = useCallback((serverCart: unknown) => {
    setCart(parseServerCart(serverCart));
  }, []);

  const refreshFromServer = useCallback(async () => {
    try {
      const serverCart = await cartService.getCart();
      syncWithServer(serverCart);
    } catch {
      // Falha silenciosa no rollback — estado anterior mantém-se
    }
  }, [syncWithServer]);

  // ── Load inicial ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined' || hasFetchedInitialCart.current) return;
    hasFetchedInitialCart.current = true;

    cartService.getCart()
      .then(syncWithServer)
      .catch(() => {}) // Carrinho vazio se offline
      .finally(() => setIsLoading(false));
  }, [syncWithServer]);

  // ── addToCart ──────────────────────────────────────────────────────────────

  const addToCart = useCallback(async (
    product: Product,
    quantity: number = 1,
    variationId?: number,
  ) => {
    // Optimistic update
    setCart(prev => {
      const idx = prev.findIndex(i => i.product_id === parseInt(product.id));
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
        return next;
      }
      return [...prev, {
        key: `temp_${Date.now()}`,
        product_id: parseInt(product.id),
        quantity,
        product: product as any,
        subtotal: (product.price * quantity).toFixed(2),
        total: (product.price * quantity).toFixed(2),
      }];
    });
    setIsOpen(true);

    beginOp();
    try {
      const updated = await cartService.addItem(product.id, quantity, variationId);
      syncWithServer(updated);
    } catch (err) {
      await refreshFromServer();
      // FIX 🟠 — substituído alert() por toast não-bloqueante
      addToast(
        err instanceof Error ? err.message : 'Não foi possível adicionar o produto.',
        'error',
      );
    } finally {
      endOp();
    }
  }, [syncWithServer, refreshFromServer, addToast]);

  // ── removeFromCart ─────────────────────────────────────────────────────────

  const removeFromCart = useCallback(async (itemKey: string) => {
    setCart(prev => prev.filter(i => i.key !== itemKey));

    beginOp();
    try {
      const updated = await cartService.removeItem(itemKey);
      syncWithServer(updated);
    } catch {
      await refreshFromServer();
      addToast('Não foi possível remover o produto.', 'error');
    } finally {
      endOp();
    }
  }, [syncWithServer, refreshFromServer, addToast]);

  // ── updateQuantity (com cancelamento de requests antigos) ──────────────────
  // FIX 🔴 — Cada item tem o seu próprio AbortController.
  // Se o utilizador clicar +/- rapidamente, o request anterior é cancelado
  // e só o último chega ao servidor.

  const updateQuantity = useCallback(async (itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(itemKey);
    }

    // Cancela request anterior para este item (se existir)
    updateAbortRef.current[itemKey]?.abort();
    const controller = new AbortController();
    updateAbortRef.current[itemKey] = controller;

    // Optimistic update imediato
    setCart(prev =>
      prev.map(i => i.key === itemKey ? { ...i, quantity } : i),
    );

    beginOp();
    try {
      const updated = await cartService.updateQuantity(itemKey, quantity);

      // Ignora a resposta se este request foi entretanto cancelado
      if (!controller.signal.aborted) {
        syncWithServer(updated);
        delete updateAbortRef.current[itemKey];
      }
    } catch (err: unknown) {
      // AbortError é esperado — não é um erro real
      if (err instanceof Error && err.name === 'AbortError') return;
      await refreshFromServer();
      addToast('Não foi possível atualizar a quantidade.', 'error');
    } finally {
      endOp();
    }
  }, [syncWithServer, refreshFromServer, removeFromCart, addToast]);

  // ── clearCart ──────────────────────────────────────────────────────────────

  const clearCart = useCallback(async () => {
    setCart([]);
    beginOp();
    try {
      await cartService.clearCart();
    } catch {
      await refreshFromServer();
    } finally {
      endOp();
    }
  }, [refreshFromServer]);

  // ── Checkout ───────────────────────────────────────────────────────────────

  const goToCheckout = useCallback(() => {
    cartService.redirectToCheckout();
  }, []);

  // FIX 🟢 — total com fallback seguro contra NaN
  const total = cart.reduce((acc, item) => {
    const val = parseFloat(item.total);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const itemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return {
    cart, total, itemCount,
    isOpen, setIsOpen,
    isLoading, isUpdating,
    addToCart, removeFromCart, updateQuantity, clearCart, goToCheckout,
    // Toast — expõe para o componente pai renderizar o ToastContainer
    toasts, removeToast,
  };
}