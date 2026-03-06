'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { CategoryNav } from '@/components/CategoryNav';
import { Footer } from '@/components/Footer';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { Contact } from '@/components/Contact';
import { Cart } from '@/components/Cart';
import { ToastContainer } from '@/components/ToastContainer';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { WordPressPage } from '@/components/WordPressPage';

export default function ContactPage() {
  const router = useRouter();
  const [wpPageExists, setWpPageExists] = useState<boolean | null>(null);
  
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
    removeToast
  } = useCart();

  useEffect(() => {
    async function checkWpPage() {
      try {
        const response = await fetch('/api/pages/contato');
        setWpPageExists(response.ok);
      } catch {
        setWpPageExists(false);
      }
    }
    checkWpPage();
  }, []);

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategorySelect = (id: string, name: string) => {
    const params = new URLSearchParams();
    params.set('categoryId', id);
    if (name) params.set('categoryName', name);
    router.push(`/products?${params.toString()}`);
  };

  if (wpPageExists === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-r-transparent" />
      </div>
    );
  }

  if (wpPageExists) {
    return <WordPressPage slug="contato" />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        cartItemCount={itemCount}
        onCartClick={() => setCartOpen(true)}
        onNavigate={navigateTo}
        onSearch={() => {}}
      />

      <CategoryNav onCategorySelect={handleCategorySelect} />

      <Contact />

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