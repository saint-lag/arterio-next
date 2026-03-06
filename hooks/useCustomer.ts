'use client';

import useSWR from 'swr';
import { useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import type { WCCustomer, UpdateProfilePayload } from '@/app/types/account';

const CUSTOMER_KEY = 'account/profile';

async function fetcher(url: string): Promise<WCCustomer> {
  const res = await fetch(`/api/${url}`);
  if (res.status === 401) throw new Error('401');
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? `Erro ${res.status}`);
  }
  return res.json();
}

export function useCustomer() {
  const { addToast } = useToast();
  const { isAuthenticated } = useAuth();

  const { data: customer, isLoading, mutate } = useSWR<WCCustomer>(
    isAuthenticated ? CUSTOMER_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
    },
  );

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    try {
      const res = await fetch('/api/account/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Erro ao atualizar');
      }
      const updated: WCCustomer = await res.json();
      // Injeta resposta fresca no cache — sem re-fetch (mesmo padrão do useCart)
      await mutate(updated, { revalidate: false });
      addToast('Dados atualizados com sucesso.', 'success');
    } catch (err) {
      // Recupera estado real do servidor em caso de erro
      await mutate();
      addToast(err instanceof Error ? err.message : 'Erro ao atualizar.', 'error');
      throw err;
    }
  }, [mutate, addToast]);

  return { customer, isLoading, updateProfile };
}
