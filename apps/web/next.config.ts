import type { NextConfig } from "next";

// Cabeceras básicas desde el primer día (plan 001, sección 5). HSTS y CSP llegan con la spec 010.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), gyroscope=(), accelerometer=()" },
];

const nextConfig: NextConfig = {
  // El E2E compila en otra carpeta para no pisar la de `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Imagen de Docker pequeña (`NEXT_OUTPUT=standalone` al construirla); `next start` no admite standalone.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
