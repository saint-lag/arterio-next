'use client';

import { MessageCircle } from "lucide-react";
import { getWhatsAppLink } from "@/app/config/store";

export function WhatsAppButton() {
  const handleClick = () => {
    window.open(getWhatsAppLink(), "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-20 right-12 z-40 flex h-14 w-14 items-center justify-center bg-black text-white shadow-lg hover:bg-black/90 transition-all hover:scale-105"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle size={24} strokeWidth={1.5} />
    </button>
  );
}
