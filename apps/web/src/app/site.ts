// Nombre, metadatos y color de barra de SuMando (spec 002, RF-1, RF-2 y RF-7). Aparte de `layout.tsx` para que los
// tests los lean sin cargar CSS ni fuentes.
import type { Metadata, Viewport } from "next";
import { es } from "@/i18n";

const name = es.common.appName;

export const siteMetadata: Metadata = {
  title: { default: name, template: `%s · ${name}` },
  applicationName: name,
  description: es.common.appDescription,
  appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
};

// Mismos valores que `--page` en `src/ui/tokens.css`: la barra del navegador y la del teléfono siguen el modo.
export const siteViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5F6FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1120" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};
