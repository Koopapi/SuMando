import type { Metadata, Viewport } from "next";
import { SwRegister } from "@/features/shell/sw-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mando",
  applicationName: "Mando",
  appleWebApp: { capable: true, title: "Mando", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#2d4f9a", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
