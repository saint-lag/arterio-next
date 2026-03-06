'use client';

import { useAuth } from '@/hooks/useAuth';
import { useOrders } from '@/hooks/useOrders';
import { OrderCard } from '@/components/account/OrderCard';
import { OrderSkeleton } from '@/components/account/OrderSkeleton';
import { STORE_INFO } from '@/app/config/store';
import Link from 'next/link';

export default function ContaPage() {
  const { user } = useAuth();
  const { orders, isLoading } = useOrders(1);
  const recentOrders = orders.slice(0, 3);

  return (
    <div>
      <h1 className="text-2xl tracking-tight mb-1">Olá, {user?.name?.split(' ')[0]}</h1>
      <p className="text-sm text-black/50 mb-8">Bem-vindo à sua conta {STORE_INFO.name}.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
        <Link
          href="/conta/pedidos"
          className="border border-black/10 p-6 hover:border-black transition-colors"
        >
          <p className="text-xs text-black/50 uppercase tracking-widest mb-1">Pedidos</p>
          <p className="text-2xl">{isLoading ? '—' : orders.length}</p>
        </Link>
        <Link
          href="/conta/enderecos"
          className="border border-black/10 p-6 hover:border-black transition-colors"
        >
          <p className="text-xs text-black/50 uppercase tracking-widest mb-1">Endereços</p>
          <p className="text-2xl">2</p>
        </Link>
      </div>

      {isLoading ? (
        <OrderSkeleton count={3} />
      ) : recentOrders.length > 0 ? (
        <div>
          <h2 className="text-sm uppercase tracking-widest mb-4">Pedidos Recentes</h2>
          <div className="space-y-3">
            {recentOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
