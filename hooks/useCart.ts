'use client';

// ─── useCart ──────────────────────────────────────────────────────────────────
//
// Regras de mutação:
//   1. Cada acção (add/update/remove) chama a API e recebe o carrinho completo
//   2. Esse carrinho é injectado no cache SWR com revalidate:false (sem re-fetch)
//   3. keepPreviousData:false garante que não há "flashes" de dados antigos
//   4. Em caso de erro, força revalidação para garantir estado correcto
//
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { cartApi } from '@/app/services/cart';
import { normalizeCart, normalizeTotal } from '@/utils/cartNormalizer';
import { useToast } from '@/hooks/useToast';
import type { CartItem, Product } from '@/app/types/woocommerce';

const CART_KEY = 'cart';

export function useCart() {
  const [isOpen,     setIsOpen]     = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toasts, addToast, removeToast } = useToast();

  const {
    data: serverCart,
    isLoading,
    mutate,
  } = useSWR(CART_KEY, cartApi.fetcher, {
    revalidateOnFocus:    true,
    revalidateOnReconnect: true,
    // CRÍTICO: false evita mostrar dados antigos enquanto carrega os novos
    keepPreviousData: false,
    refreshInterval:  0,
    onError: () => {
      // Em caso de erro silencioso, não bloquear a UI
    },
  });

  const cart:      CartItem[] = normalizeCart(serverCart);
  const total:     number     = normalizeTotal(serverCart);
  const itemCount: number     = cart.reduce((acc, item) => acc + item.quantity, 0);

  // ── Helper central de mutação ─────────────────────────────────────────────
  // A API do WooCommerce devolve o carrinho completo em CADA resposta de mutação.
  // Usamos esse dado directamente no cache — sem optimistic updates que causam flashes.

  const runMutation = useCallback(async (
    action: () => Promise<unknown>,
    errorMessage: string,
  ) => {
    setIsUpdating(true);
    try {
      const updatedCart = await action();
      // Injecta o carrinho actualizado no SWR sem fazer re-fetch
      // revalidate:false é crítico — evita o ciclo: dados novos → re-fetch → dados antigos
      await mutate(updatedCart, { revalidate: false });
    } catch (err) {
      // Em erro, força re-fetch do servidor para garantir estado real
      await mutate();
      addToast(
        err instanceof Error ? err.message : errorMessage,
        'error',
      );
    } finally {
      setIsUpdating(false);
    }
  }, [mutate, addToast]);

  // ── addToCart ──────────────────────────────────────────────────────────────

  const addToCart = useCallback(async (
    product: Product,
    quantity: number = 1,
    variationId?: number,
  ) => {
    setIsOpen(true);
    await runMutation(
      () => cartApi.addItem(product.id, quantity, variationId),
      'Não foi possível adicionar o produto.',
    );
  }, [runMutation]);

  // ── updateQuantity ─────────────────────────────────────────────────────────

  const updateQuantity = useCallback(async (key: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(key);
    await runMutation(
      () => cartApi.updateItem(key, quantity),
      'Não foi possível actualizar a quantidade.',
    );
  }, [runMutation]);

  // ── removeFromCart ─────────────────────────────────────────────────────────

  const removeFromCart = useCallback(async (key: string) => {
    await runMutation(
      () => cartApi.removeItem(key),
      'Não foi possível remover o produto.',
    );
  }, [runMutation]);

  // ── clearCart ──────────────────────────────────────────────────────────────

  const clearCart = useCallback(async () => {
    setIsUpdating(true);
    try {
      for (const item of cart) {
        await cartApi.removeItem(item.key);
      }
      cartApi.clearToken();
      await mutate();
    } catch {
      await mutate();
    } finally {
      setIsUpdating(false);
    }
  }, [cart, mutate]);

  // ── goToCheckout ───────────────────────────────────────────────────────────

  const goToCheckout = useCallback(() => {
    cartApi.redirectToCheckout();
  }, []);

  return {
    cart,
    total,
    itemCount,
    isOpen,
    setIsOpen,
    isLoading,
    isUpdating,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    goToCheckout,
    toasts,
    removeToast,
  };
}