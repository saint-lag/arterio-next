'use client';

import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CategoryNav } from "@/components/CategoryNav";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { About } from "@/components/About";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/useCart";
import { Cart } from "@/components/Cart";
import { ToastContainer } from "@/components/ToastContainer";
import { WordPressPage } from '@/components/WordPressPage';


export default function AboutPage() {
  const router = useRouter();
  const [wpPageExists, setWpPageExists] = useState<boolean | null>(null);

  const {
    cart,
    total,
    itemCount,
    isOpen: cartOpen,
    setIsOpen: setCartOpen,
    addToCart,
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
        const response = await fetch('/api/pages/sobre');
        setWpPageExists(response.ok);
      } catch {
        setWpPageExists(false);
      }
    }
    checkWpPage();
  }, []);

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCategorySelect = (id: string, category: string) => {
    router.push(`/products?category=${encodeURIComponent(category)}`);
  };

  const handleSearch = (term: string) => {
    if (term.trim()) {
      router.push(`/products?search=${encodeURIComponent(term)}`);
    }
  };

  // Enquanto verifica, mostra loading
  if (wpPageExists === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-black border-r-transparent" />
      </div>
    );
  }

  // Se a página WP existe, usa o componente WordPress
  if (wpPageExists) {
    return <WordPressPage slug="sobre" />;
  }

  // Senão, usa o placeholder existente
  return (
    <div className="min-h-screen bg-white">
      <Header
        cartItemCount={itemCount}
        onCartClick={() => setCartOpen(true)}
        onNavigate={navigateTo}
        onSearch={handleSearch}
      />

      <CategoryNav onCategorySelect={handleCategorySelect} />

      <About />

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
