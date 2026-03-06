'use client';

import { useOrder } from '@/hooks/useOrders';
import { useParams } from 'next/navigation';
import { OrderSkeleton } from '@/components/account/OrderSkeleton';
import { formatCurrency, formatDate } from '@/utils/formatters';
import Link from 'next/link';
import { ChevronLeft, Truck, ExternalLink, Copy, Check, X } from 'lucide-react';
import { useState } from 'react';

const STATUS_LABELS: Record<string, string> = {
  'pending':    'Aguardando Pagamento',
  'processing': 'Em Processamento',
  'on-hold':    'Em Espera',
  'completed':  'Concluído',
  'cancelled':  'Cancelado',
  'refunded':   'Reembolsado',
  'failed':     'Falhou',
};

const CANCELLABLE_STATUSES = ['pending', 'processing', 'on-hold'];

export default function PedidoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading, error, cancelOrder } = useOrder(id);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
      <div className="flex items-center gap-3 mb-2">
        <p className="text-sm text-black/40">{formatDate(order.date_created)}</p>
        <span className="text-xs text-black/30">•</span>
        <p className={`text-xs tracking-wide ${order.status === 'cancelled' ? 'text-red-500' : 'text-black/50'}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </p>
      </div>

      {/* Cancel Order */}
      {CANCELLABLE_STATUSES.includes(order.status) && (
        <button
          onClick={() => { setCancelError(null); setShowCancelModal(true); }}
          className="text-xs text-red-500 hover:text-red-700 transition-colors mb-8 underline underline-offset-2"
        >
          Cancelar pedido
        </button>
      )}
      {!CANCELLABLE_STATUSES.includes(order.status) && <div className="mb-8" />}

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

      {/* Tracking */}
      {order.tracking && order.tracking.length > 0 && (
        <div className="mt-8 border border-black/10 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Truck size={18} strokeWidth={1.5} className="text-black/60" />
            <h3 className="text-sm uppercase tracking-widest">Rastreamento</h3>
          </div>
          <div className="space-y-4">
            {order.tracking.map((t, i) => (
              <TrackingBlock key={i} item={t} />
            ))}
          </div>
        </div>
      )}

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

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => !isCancelling && setShowCancelModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white p-8 shadow-xl">
            <button
              onClick={() => !isCancelling && setShowCancelModal(false)}
              className="absolute right-4 top-4 text-black/40 hover:text-black transition-colors"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            <h3 className="text-lg tracking-tight mb-2">Cancelar Pedido</h3>
            <p className="text-sm text-black/50 mb-6">
              Tem certeza que deseja cancelar o pedido #{order.number}? Esta ação não pode ser desfeita.
            </p>

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs border border-red-100">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 border border-black/20 py-3 text-sm tracking-wide hover:border-black transition-colors disabled:opacity-50"
              >
                VOLTAR
              </button>
              <button
                onClick={async () => {
                  setIsCancelling(true);
                  setCancelError(null);
                  try {
                    await cancelOrder();
                    setShowCancelModal(false);
                  } catch (err) {
                    setCancelError(err instanceof Error ? err.message : 'Erro ao cancelar.');
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling}
                className="flex-1 bg-red-600 text-white py-3 text-sm tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isCancelling ? 'CANCELANDO...' : 'CONFIRMAR'}
              </button>
            </div>
          </div>
        </div>
      )}
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="text-black/40 hover:text-black transition-colors"
      title="Copiar código"
    >
      {copied ? <Check size={14} strokeWidth={1.5} /> : <Copy size={14} strokeWidth={1.5} />}
    </button>
  );
}

function TrackingBlock({ item }: { item: { tracking_provider: string; tracking_number: string; tracking_link?: string; date_shipped?: string } }) {
  return (
    <div className="flex flex-col gap-1.5">
      {item.tracking_provider && (
        <p className="text-xs text-black/40">{item.tracking_provider}</p>
      )}
      <div className="flex items-center gap-2">
        <code className="text-sm font-mono tracking-wide">{item.tracking_number}</code>
        <CopyButton text={item.tracking_number} />
        {item.tracking_link && (
          <a
            href={item.tracking_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-black/40 hover:text-black transition-colors"
            title="Rastrear envio"
          >
            <ExternalLink size={14} strokeWidth={1.5} />
          </a>
        )}
      </div>
      {item.date_shipped && (
        <p className="text-xs text-black/40">Enviado em {formatDate(item.date_shipped)}</p>
      )}
    </div>
  );
}
