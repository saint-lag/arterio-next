'use client';

import Link from 'next/link';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Truck } from 'lucide-react';
import type { WCOrder } from '@/app/types/account';

const STATUS_LABELS: Record<string, string> = {
  'pending':    'Aguardando Pagamento',
  'processing': 'Em Processamento',
  'on-hold':    'Em Espera',
  'completed':  'Concluído',
  'cancelled':  'Cancelado',
  'refunded':   'Reembolsado',
  'failed':     'Falhou',
};

interface OrderCardProps {
  order: WCOrder;
}

export function OrderCard({ order }: OrderCardProps) {
  const hasTracking = order.tracking && order.tracking.length > 0;

  return (
    <Link
      href={`/conta/pedidos/${order.id}`}
      className="flex items-center justify-between p-4 border border-black/10 hover:border-black transition-colors"
    >
      <div>
        <p className="text-sm">Pedido #{order.number}</p>
        <p className="text-xs text-black/40 mt-0.5">{formatDate(order.date_created)}</p>
      </div>
      <div className="text-right flex items-center gap-3">
        {hasTracking && (
          <span className="flex items-center gap-1 text-xs text-black/50" title="Rastreio disponível">
            <Truck size={14} strokeWidth={1.5} />
          </span>
        )}
        <div>
          <p className="text-sm">{formatCurrency(Number(order.total))}</p>
          <p className="text-xs text-black/40 mt-0.5">
            {STATUS_LABELS[order.status] ?? order.status}
          </p>
        </div>
      </div>
    </Link>
  );
}
