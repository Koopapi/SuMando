import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import { SwRegister } from "@/features/shell/sw-register";
import { ToastProvider } from "@/ui/toast";
import { siteMetadata, siteViewport } from "./site";
import "./globals.css";

// Fuentes servidas desde la propia app (plan 002, dirección Tablero): Space Grotesk para marca, títulos, botones y
// números; IBM Plex Sans para el texto.
const brand = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-brand-face", display: "swap" });
const text = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-text-face", display: "swap" });

export const metadata: Metadata = siteMetadata;
export const viewport: Viewport = siteViewport;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${brand.variable} ${text.variable}`}>
      <body className="bg-page font-sans text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
        <SwRegister />
      </body>
    </html>
  );
}
