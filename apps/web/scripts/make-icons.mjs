// Genera los iconos de SuMando (spec 002, RF-2) desde la misma perilla del logo (`src/ui/brand/logo-svg.ts`).
// Uso: `node scripts/make-icons.mjs` desde apps/web. Node 24 importa el .ts directo (sin tipos en tiempo de ejecución).
import { chromium } from "@playwright/test";
import { dialSvg } from "../src/ui/brand/logo-svg.ts";

const ICONS = [
  { out: "public/icons/icon-192.png", size: 192, opts: {} },
  { out: "public/icons/icon-512.png", size: 512, opts: {} },
  // Maskable: fondo completo y la perilla dentro de la zona segura (círculo del 80 %).
  { out: "public/icons/icon-maskable-512.png", size: 512, opts: { square: true, scale: 0.72 } },
  // Apple recorta las esquinas por su cuenta: fondo completo y sin transparencia.
  { out: "src/app/apple-icon.png", size: 180, opts: { square: true, scale: 0.86 } },
  { out: "src/app/icon.png", size: 64, opts: { small: true } },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const { out, size, opts } of ICONS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${dialSvg(opts).replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: out, omitBackground: true });
  console.log(out);
}
await browser.close();
