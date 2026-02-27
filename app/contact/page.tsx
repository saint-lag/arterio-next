'use client';

import { Header } from "@/components/Header";
import { CategoryNav } from "@/components/CategoryNav";
import { Footer } from "@/components/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Contact } from "@/components/Contact";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cart } from "@/components/Cart";
import { NotifyMeModal } from "@/components/NotifyMeModal";
import { useCart } from "@/hooks/useCart";
import { useRouter } from "next/navigation";

const About = () => <div></div>;

export default function ContactPage() {
  const router = useRouter();

  const navigateTo = (path: string) => router.push(path);
  const handleSearch = (query: string) => console.log(query);
  const handleCategorySelect = (category: string) => console.log(category);
  return (
    <div className="min-h-screen bg-white">
      <Header
        cartItemCount={0}
        onNavigate={navigateTo}
        onSearch={handleSearch}
      />

      <CategoryNav onCategorySelect={handleCategorySelect} />

      <About />

      <WhatsAppButton />

      <Footer onNavigate={navigateTo} />
    </div>
  )
}