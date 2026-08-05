import type { Metadata } from "next";
import { AuthProvider } from "@/app/providers/AuthProvider";
import "./globals.css";
import { SWRProvider } from "./providers/SWRProvider";
import { STORE_INFO } from "@/app/config/store";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: `${STORE_INFO.name} - ${STORE_INFO.tagline}`,
  description: "Soluções completas em materiais técnicos e suprimentos profissionais para cinema, TV e fotografia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-white text-black">
        <SWRProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SWRProvider>
        <SpeedInsights />
      </body >
    </html >
  );
}
