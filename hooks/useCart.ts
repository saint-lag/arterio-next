'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cartService } from '@/app/services/cart';
import type { CartItem, Product } from '@/app/types/woocommerce';

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Ref para evitar chamadas duplas no Strict Mode do React
  const hasFetchedInitialCart = useRef(false);

  // 1. Função Robusta de Sincronização (Resolve os problemas 2 e 4)
  const syncStateWithServer = useCallback((serverCart: any) => {
    if (!serverCart || !serverCart.items) {
      setCart([]);
      return;
    }

    // Tratamento de Erros da API (Produtos Fantasmas/Sem Estoque)
    if (serverCart.errors && serverCart.errors.length > 0) {
      console.warn('Avisos do Carrinho Woo:', serverCart.errors);
      // Aqui você poderia disparar um Toast alertando o usuário: "Alguns itens ficaram sem estoque"
    }

    const formattedItems: CartItem[] = serverCart.items.map((item: any) => {
      const minorUnit = item.prices?.currency_minor_unit ?? 2;
      const divisor = Math.pow(10, minorUnit);

      // Tratamento para Imagens Vistas (Fallback para placeholder se o Woo não enviar)
      const imageUrl = item.images && item.images.length > 0 
        ? item.images[0].src 
        : '/placeholder-image.jpg'; // Substitua pelo caminho de um placeholder seu

      return {
        key: item.key,
        product_id: item.id,
        variation_id: item.variation_id || undefined,
        quantity: item.quantity,
        product: {
          id: item.id.toString(),
          name: item.name,
          price: item.prices?.price ? (item.prices.price / divisor).toFixed(2) : "0.00",
          images: [{ src: imageUrl }], // Garante que a estrutura da imagem não quebre o frontend
        } as any,
        subtotal: item.totals?.line_subtotal ? (item.totals.line_subtotal / divisor).toFixed(2) : "0.00",
        total: item.totals?.line_total ? (item.totals.line_total / divisor).toFixed(2) : "0.00",
      };
    });

    setCart(formattedItems);
  }, []);

  // 2. Load Inicial Seguro
  useEffect(() => {
    // Garante que só roda no browser e apenas uma vez
    if (typeof window === 'undefined' || hasFetchedInitialCart.current) return;
    hasFetchedInitialCart.current = true;

    setIsLoading(true);
    cartService.getCart()
      .then(syncStateWithServer)
      .catch(error => console.error('Erro ao buscar o carrinho inicial:', error))
      .finally(() => setIsLoading(false));
  }, [syncStateWithServer]);

  // 3. Add to Cart com "Optimistic UI"
  const addToCart = useCallback(async (product: Product, quantity: number = 1, variationId?: number) => {
    // A. Atualização Otimista
    setCart(prev => {
      const existingItemIndex = prev.findIndex(i => i.product_id === parseInt(product.id));
      if (existingItemIndex > -1) {
        const newCart = [...prev];
        newCart[existingItemIndex].quantity += quantity;
        return newCart;
      }
      
      // Cria um item temporário
      return [...prev, {
        key: `temp_${Date.now()}`,
        product_id: parseInt(product.id),
        quantity,
        product: product as any,
        subtotal: (product.price * quantity).toFixed(2),
        total: (product.price * quantity).toFixed(2),
      }];
    });
    
    setIsOpen(true); // Abre a gaveta na hora!

    // B. Comunicação real com o servidor no background
    try {
      setIsUpdating(true);
      const updatedCart = await cartService.addItem(product.id, quantity, variationId);
      // O servidor respondeu! Agora trocamos o carrinho "falso" pelo verdadeiro com as Keys oficiais
      syncStateWithServer(updatedCart);
    } catch (error) {
      // C. Se a internet cair ou o Woo recusar, fazemos o "Rollback"
      console.error("Falha ao adicionar, revertendo...", error);
      cartService.getCart().then(syncStateWithServer); 
      alert("Desculpe, não conseguimos adicionar o produto ao carrinho.");
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  const removeFromCart = useCallback(async (itemKey: string) => {
    // Atualização Otimista
    setCart(prev => prev.filter(item => item.key !== itemKey));
    
    try {
      setIsUpdating(true);
      const updatedCart = await cartService.removeItem(itemKey);
      syncStateWithServer(updatedCart);
    } catch (error) {
      cartService.getCart().then(syncStateWithServer); // Rollback
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  const updateQuantity = useCallback(async (itemKey: string, quantity: number) => {
    // Atualização Otimista
    setCart(prev => prev.map(item => item.key === itemKey ? { ...item, quantity } : item));

    try {
      setIsUpdating(true);
      const updatedCart = await cartService.updateQuantity(itemKey, quantity);
      syncStateWithServer(updatedCart);
    } catch (error) {
      cartService.getCart().then(syncStateWithServer); // Rollback
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  const clearCart = useCallback(async () => {
    setCart([]); // Otimista
    try {
      setIsUpdating(true);
      const emptyCart = await cartService.clearCart();
      syncStateWithServer(emptyCart);
    } finally {
      setIsUpdating(false);
    }
  }, [syncStateWithServer]);

  const goToCheckout = useCallback(() => {
    cartService.redirectToCheckout();
  }, []);

  const total = cart.reduce((acc, item) => acc + parseFloat(item.total), 0);
  const itemCount = cart.reduce((count, item) => count + item.quantity, 0);

  return {
    cart, total, itemCount, isOpen, setIsOpen, isLoading, isUpdating,
    addToCart, removeFromCart, updateQuantity, clearCart, goToCheckout,
  };
}