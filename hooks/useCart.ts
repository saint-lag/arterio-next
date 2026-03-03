'use client';

import { useState, useEffect, useCallback } from 'react';
import { cartService } from '@/app/services/cart';
import type { CartItem, Product } from '@/app/types/woocommerce';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Novos estados para UI fluida
  const [isLoading, setIsLoading] = useState(true); // Para o carregamento inicial da página
  const [isUpdating, setIsUpdating] = useState(false); // Para quando adiciona/remove itens

  // Função auxiliar para padronizar a resposta da Store API 
  // com o tipo CartItem que o seu frontend já utiliza
  const syncStateWithServer = useCallback((serverCart: any) => {
    if (!serverCart || !serverCart.items) {
      setCart([]);
      return;
    }

    const formattedItems: CartItem[] = serverCart.items.map((item: any) => {
      // Usamos currency_minor_unit dinâmico para não falhar caso a loja mude as casas decimais
      const minorUnit = item.prices?.currency_minor_unit ?? 2;
      const divisor = Math.pow(10, minorUnit);

      return {
        key: item.key,
        product_id: item.id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
        product: {
          id: item.id.toString(),
          name: item.name,
          price: (item.prices.price / divisor).toFixed(2),
          images: item.images,
        } as any,
        subtotal: (item.totals.line_subtotal / divisor).toFixed(2),
        total: (item.totals.line_total / divisor).toFixed(2),
      };
    });

    setCart(formattedItems);
  }, []);

  // 1. Carregamento inicial do Carrinho
  useEffect(() => {
    setIsLoading(true);
    cartService.getCart()
      .then((serverCart) => {
        syncStateWithServer(serverCart);
      })
      .catch((error) => {
        console.error('Erro ao buscar o carrinho:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [syncStateWithServer]);

  // 2. Adicionar ao Carrinho (Agora Assíncrono)
  const addToCart = useCallback(async (product: Product, quantity: number = 1, variationId?: number) => {
    try {
      setIsUpdating(true);
      const updatedCart = await cartService.addItem(product.id, quantity, variationId);
      syncStateWithServer(updatedCart);
      setIsOpen(true); // Abre a gaveta do carrinho
    } catch (error) {
      alert(error instanceof Error ? error.message : "Erro ao adicionar produto.");
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  // 3. Remover do Carrinho (Agora Assíncrono)
  const removeFromCart = useCallback(async (itemKey: string) => {
    try {
      setIsUpdating(true);
      const updatedCart = await cartService.removeItem(itemKey);
      syncStateWithServer(updatedCart);
    } catch (error) {
      console.error('Erro ao remover item:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  // 4. Atualizar Quantidade (Agora Assíncrono)
  const updateQuantity = useCallback(async (itemKey: string, quantity: number) => {
    try {
      setIsUpdating(true);
      const updatedCart = await cartService.updateQuantity(itemKey, quantity);
      syncStateWithServer(updatedCart);
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  // 5. Limpar Carrinho (Agora Assíncrono)
  const clearCart = useCallback(async () => {
    try {
      setIsUpdating(true);
      const emptyCart = await cartService.clearCart();
      syncStateWithServer(emptyCart);
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  // 6. Ir para o Checkout (Agora Síncrono e Limpo)
  const goToCheckout = useCallback(() => {
    cartService.redirectToCheckout();
  }, []);

  // 7. Cálculos locais com base no array atualizado do servidor
  const total = cart.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return {
    cart,
    total,
    itemCount,
    isOpen,
    setIsOpen,
    isLoading,   // NOVO: Útil para mostrar skeleton loader no primeiro render
    isUpdating,  // NOVO: Útil para dar disable nos botões de + e -
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    goToCheckout,
  };
}