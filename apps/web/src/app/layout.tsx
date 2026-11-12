import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { SwRegister } from "@/features/shell/sw-register";
import { siteMetadata, siteViewport } from "./site";
import "./globals.css";

// Fuentes servidas desde la propia app (plan 002, decisiones): Space Grotesk para marca, títulos y botones; Inter
// para el texto.
const brand = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-brand-face", display: "swap" });
const text = Inter({ subsets: ["latin"], variable: "--font-text-face", display: "swap" });

export const metadata: Metadata = siteMetadata;
export const viewport: Viewport = siteViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${brand.variable} ${text.variable}`}>
      <body className="bg-page font-sans text-ink antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
