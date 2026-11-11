// Genera los iconos de la PWA (RF-39) con Chromium: un cuadrado del color de marca con la inicial. Se ejecuta una vez.
import { chromium } from "@playwright/test";

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [size, out] of [
  [192, "public/icons/icon-192.png"],
  [512, "public/icons/icon-512.png"],
  [64, "src/app/icon.png"],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0"><div style="width:${size}px;height:${size}px;background:#2d4f9a;display:flex;align-items:center;justify-content:center;font:700 ${Math.round(size * 0.62)}px system-ui,sans-serif;color:#fff">M</div></body></html>`,
  );
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
