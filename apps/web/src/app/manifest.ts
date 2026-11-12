// Instalable con el nombre y el icono de SuMando (spec 001 RF-39; spec 002 RF-2).
import type { MetadataRoute } from "next";
import { es } from "@/i18n";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: es.common.appName,
    short_name: es.common.appName,
    description: es.common.appDescription,
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F6FA",
    theme_color: "#22306B",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
