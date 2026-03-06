'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { CategoryNav } from '@/components/CategoryNav';
import { Footer } from '@/components/Footer';
import { Cart } from '@/components/Cart';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ToastContainer } from '@/components/ToastContainer';
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';

interface WordPressPageProps {
  slug: string;
}

interface PageData {
  id: number;
  title: string;
  content: string;
  slug: string;
}

export function WordPressPage({ slug }: WordPressPageProps) {
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    cart,
    total,
    itemCount,
    isOpen: cartOpen,
    setIsOpen: setCartOpen,
    removeFromCart,
    updateQuantity,
    goToCheckout,
    isRedirecting,
    toasts,
    removeToast,
  } = useCart();

  useEffect(() => {
    async function fetchPage() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/pages/${slug}`);
        
        if (!response.ok) {
          throw new Error('Página não encontrada');
        }
        
        const data = await response.json();
        setPage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar página');
      } finally {
        setLoading(false);
      }
    }

    fetchPage();
  }, [slug]);

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategorySelect = (categoryId: string, categoryName?: string) => {
    const params = new URLSearchParams();
    params.set('categoryId', categoryId);
    if (categoryName) params.set('categoryName', categoryName);
    router.push(`/products?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header
        cartItemCount={itemCount}
        onCartClick={() => setCartOpen(true)}
        onNavigate={navigateTo}
        onSearch={() => {}}
      />

      <CategoryNav onCategorySelect={handleCategorySelect} />

      <main className="mx-auto max-w-4xl px-6 py-16">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-r-transparent" />
          </div>
        )}

        {error && (
          <div className="py-24 text-center">
            <p className="text-sm text-red-500 mb-2">Erro ao carregar página</p>
            <p className="text-xs text-black/40">{error}</p>
          </div>
        )}

        {!loading && !error && page && (
          <article className="prose prose-sm max-w-none">
            <h1 className="mb-8 text-3xl tracking-tight text-black">
              {page.title}
            </h1>
            <div
              className="text-sm leading-relaxed text-black/80 [&_a]:text-black [&_a]:underline [&_a]:hover:text-black/60 [&_h2]:text-xl [&_h2]:font-normal [&_h2]:tracking-tight [&_h2]:text-black [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-lg [&_h3]:font-normal [&_h3]:tracking-tight [&_h3]:text-black [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        )}
      </main>

      <WhatsAppButton />

      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        total={total}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={goToCheckout}
        isRedirecting={isRedirecting}
      />

      <Footer onNavigate={navigateTo} />
    </div>
  );
}
