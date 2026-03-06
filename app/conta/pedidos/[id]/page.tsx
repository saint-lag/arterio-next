'use client';

import { useOrder } from '@/hooks/useOrders';
import { useParams } from 'next/navigation';
import { OrderSkeleton } from '@/components/account/OrderSkeleton';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, error } = useOrder(id);

  if (isLoading) return <OrderSkeleton count={1} />;
  if (error || !order) {
    return <p className="text-red-500 text-sm">Pedido não encontrado.</p>;
  }

  return (
    <div>
      <Link
        href="/conta/pedidos"
        className="inline-flex items-center gap-1 text-sm text-black/40 hover:text-black transition-colors mb-6"
      >
        <ChevronLeft size={16} strokeWidth={1.5} />
        Voltar aos Pedidos
      </Link>

      <h1 className="text-xl tracking-tight mb-2">Pedido #{order.number}</h1>
      <p className="text-sm text-black/40 mb-8">{formatDate(order.date_created)}</p>

      {/* Items */}
      <div className="border border-black/10 divide-y divide-black/10">
        {order.line_items.map(item => (
          <div key={item.id} className="flex items-center gap-4 p-4">
            {item.image && (
              <img
                src={item.image.src}
                alt={item.name}
                className="w-14 h-14 object-cover border border-black/10"
              />
            )}
            <div className="flex-1">
              <p className="text-sm">{item.name}</p>
              <p className="text-xs text-black/40">Qtd: {item.quantity}</p>
            </div>
            <p className="text-sm">{formatCurrency(Number(item.total))}</p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-black/40">Método de Pagamento</span>
          <span>{order.payment_method_title}</span>
        </div>
        {order.customer_note && (
          <div className="flex justify-between text-sm">
            <span className="text-black/40">Nota</span>
            <span>{order.customer_note}</span>
          </div>
        )}
        <div className="flex justify-between text-sm pt-3 border-t border-black/10">
          <span className="text-black/40">Total</span>
          <span className="font-medium">{formatCurrency(Number(order.total))}</span>
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-10 pt-8 border-t border-black/10">
        <div>
          <h3 className="text-sm uppercase tracking-widest mb-3">Endereço de Faturação</h3>
          <AddressBlock address={order.billing} />
        </div>
        <div>
          <h3 className="text-sm uppercase tracking-widest mb-3">Endereço de Entrega</h3>
          <AddressBlock address={order.shipping} />
        </div>
      </div>
    </div>
  );
}

function AddressBlock({ address }: { address: { first_name: string; last_name: string; address_1: string; city: string; state: string; postcode: string } }) {
  return (
    <div className="text-sm text-black/60 space-y-0.5">
      <p>{address.first_name} {address.last_name}</p>
      <p>{address.address_1}</p>
      <p>{address.city}, {address.state}</p>
      <p>{address.postcode}</p>
    </div>
  );
}
