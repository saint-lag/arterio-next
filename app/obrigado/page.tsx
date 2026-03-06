'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Package, ChevronRight } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { STORE_INFO, getWhatsAppLink } from '@/app/config/store';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { useRouter } from 'next/navigation';

interface OrderSummary {
  id: number;
  number: string;
  status: string;
  date_created: string;
  total: string;
  currency_symbol: string;
  payment_method_title: string;
  billing: {
    first_name: string;
    last_name: string;
    email?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    quantity: number;
    total: string;
    image?: { src: string };
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  'pending':     'Aguardando Pagamento',
  'processing':  'Em Processamento',
  'on-hold':     'Em Espera',
  'completed':   'Concluído',
};

export default function ObrigadoPage() {
  return (
    <Suspense fallback={<ObrigadoSkeleton />}>
      <ObrigadoContent />
    </Suspense>
  );
}

function ObrigadoSkeleton() {
  const router = useRouter();
  const navigateTo = (page: string) => {
    router.push(`/${page}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header onNavigate={navigateTo} />
      <main className="mx-auto max-w-2xl px-6 py-24">
        <div className="animate-pulse space-y-6">
          <div className="h-12 w-12 rounded-full bg-neutral-100 mx-auto" />
          <div className="h-6 w-48 bg-neutral-100 mx-auto" />
          <div className="h-4 w-64 bg-neutral-100 mx-auto" />
          <div className="space-y-3 pt-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-neutral-100" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function ObrigadoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const orderId = searchParams.get('order_id');
  const orderKey = searchParams.get('key');

  useEffect(() => {
    if (!orderId || !orderKey) {
      setLoading(false);
      setError(true);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}?key=${encodeURIComponent(orderKey!)}`);
        if (!res.ok) throw new Error('Not found');
        const data = await res.json();
        setOrder(data);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId, orderKey]);

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header onNavigate={navigateTo} />
        <main className="mx-auto max-w-2xl px-6 py-24">
          <div className="animate-pulse space-y-6">
            <div className="h-12 w-12 rounded-full bg-neutral-100 mx-auto" />
            <div className="h-6 w-48 bg-neutral-100 mx-auto" />
            <div className="h-4 w-64 bg-neutral-100 mx-auto" />
            <div className="space-y-3 pt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-neutral-100" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Error / no order found
  if (error || !order) {
    return (
      <div className="min-h-screen bg-white">
        <Header onNavigate={navigateTo} />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <Package size={48} strokeWidth={1} className="mx-auto mb-6 text-black/20" />
          <h1 className="text-2xl tracking-tight mb-3">Pedido não encontrado</h1>
          <p className="text-sm text-black/50 mb-8">
            Não foi possível localizar os detalhes do seu pedido.
            Se acabou de finalizar a compra, verifique seu e-mail para a confirmação.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="bg-black text-white px-6 py-3 text-sm tracking-wide hover:bg-black/90 transition-colors"
            >
              VOLTAR AO INÍCIO
            </Link>
            <a
              href={getWhatsAppLink(STORE_INFO.whatsapp.defaultMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-black px-6 py-3 text-sm tracking-wide hover:bg-black hover:text-white transition-colors"
            >
              FALAR CONOSCO
            </a>
          </div>
        </main>
        <Footer onNavigate={navigateTo} />
      </div>
    );
  }

  // Success
  return (
    <div className="min-h-screen bg-white">
      <Header onNavigate={navigateTo} />

      <main className="mx-auto max-w-2xl px-6 py-16 sm:py-24">
        {/* Confirmation Header */}
        <div className="text-center mb-12">
          <CheckCircle
            size={48}
            strokeWidth={1}
            className="mx-auto mb-6 text-black"
          />
          <h1 className="text-3xl tracking-tight mb-2">
            Obrigado, {order.billing.first_name}!
          </h1>
          <p className="text-sm text-black/50">
            Seu pedido foi recebido e está sendo processado.
          </p>
        </div>

        {/* Order Info Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-black/10 mb-10">
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] tracking-widest text-black/40 mb-1">PEDIDO</p>
            <p className="text-sm font-medium">#{order.number}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] tracking-widest text-black/40 mb-1">DATA</p>
            <p className="text-sm">{formatDate(order.date_created)}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] tracking-widest text-black/40 mb-1">TOTAL</p>
            <p className="text-sm font-medium">{formatCurrency(Number(order.total))}</p>
          </div>
          <div className="bg-white p-4 text-center">
            <p className="text-[10px] tracking-widest text-black/40 mb-1">PAGAMENTO</p>
            <p className="text-sm">{order.payment_method_title}</p>
          </div>
        </div>

        {/* Status */}
        <div className="border border-black/10 p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-black animate-pulse" />
            <span className="text-sm">
              {STATUS_LABELS[order.status] ?? order.status}
            </span>
          </div>
          {order.billing.email && (
            <p className="text-xs text-black/40">
              Confirmação enviada para {order.billing.email}
            </p>
          )}
        </div>

        {/* Items */}
        <div className="mb-10">
          <h2 className="text-xs tracking-widest text-black/40 mb-4">ITENS DO PEDIDO</h2>
          <div className="border border-black/10 divide-y divide-black/10">
            {order.line_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4">
                {item.image?.src && (
                  <img
                    src={item.image.src}
                    alt={item.name}
                    className="w-14 h-14 object-cover border border-black/10 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-black/40">Qtd: {item.quantity}</p>
                </div>
                <p className="text-sm flex-shrink-0">{formatCurrency(Number(item.total))}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="border border-black/10 p-6 mb-10 space-y-4">
          <h2 className="text-xs tracking-widest text-black/40">PRÓXIMOS PASSOS</h2>
          <div className="space-y-3 text-sm text-black/70">
            <p>• Você receberá um e-mail com a confirmação do pedido.</p>
            <p>• Assim que o pagamento for confirmado, iniciaremos a preparação.</p>
            <p>• O código de rastreio será enviado por e-mail quando disponível.</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/conta/pedidos"
            className="flex-1 flex items-center justify-center gap-2 border border-black px-6 py-3.5 text-sm tracking-wide hover:bg-black hover:text-white transition-colors"
          >
            VER MEUS PEDIDOS
            <ChevronRight size={16} strokeWidth={1.5} />
          </Link>
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white px-6 py-3.5 text-sm tracking-wide hover:bg-black/90 transition-colors"
          >
            CONTINUAR COMPRANDO
            <ChevronRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </main>

      <WhatsAppButton />
      <Footer onNavigate={navigateTo} />
    </div>
  );
}
