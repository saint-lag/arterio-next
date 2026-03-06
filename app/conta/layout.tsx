'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Cart } from '@/components/Cart';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { ToastContainer } from '@/components/ToastContainer';

export default function ContaLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [notifyModalOpen] = useState(false);

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
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white">
      <Header
        cartItemCount={itemCount}
        onCartClick={() => setCartOpen(true)}
        onNavigate={navigateTo}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 flex flex-col md:flex-row gap-12">
        <AccountSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>

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
