// RF-39: instalable como aplicación con el nombre y el icono de Mando.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mando",
    short_name: "Mando",
    description: "Control administrativo de tus negocios",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbfc",
    theme_color: "#2d4f9a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
