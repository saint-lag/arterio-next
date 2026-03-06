'use client';

import useSWR from 'swr';
import { useAuth } from '@/hooks/useAuth';
import type { WCOrder } from '@/app/types/account';

async function fetcher(url: string): Promise<WCOrder[]> {
  const res = await fetch(`/api/${url}`);
  if (res.status === 401) throw new Error('401');
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

async function orderFetcher(url: string): Promise<WCOrder> {
  const res = await fetch(`/api/${url}`);
  if (res.status === 401) throw new Error('401');
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return res.json();
}

// Hook para lista paginada de pedidos
export function useOrders(page = 1) {
  const { isAuthenticated } = useAuth();
  const key = isAuthenticated ? `account/orders?page=${page}&per_page=10` : null;

  const { data: orders, isLoading, error } = useSWR<WCOrder[]>(key, fetcher, {
    revalidateOnFocus: false,
    errorRetryCount: 2,
  });

  return { orders: orders ?? [], isLoading, error };
}

// Hook para pedido individual
export function useOrder(id: string | number | null) {
  const { isAuthenticated } = useAuth();

  const { data: order, isLoading, error } = useSWR<WCOrder>(
    isAuthenticated && id ? `account/orders/${id}` : null,
    orderFetcher,
    { revalidateOnFocus: false, errorRetryCount: 1 },
  );

  return { order, isLoading, error };
}
