import { defineConfig, devices } from "@playwright/test";

// E2E contra la versión compilada (`next build` en `.next-e2e` + `next start`), nunca contra `next dev`
// (docs/architecture.md, lecciones de Waifu Baker). BD propia `mando_e2e`, recreada antes de arrancar.
const PORT = 3500;
const env = {
  DATABASE_URL: "postgres://localhost:5432/mando_e2e",
  NEXT_DIST_DIR: ".next-e2e",
  DEV_ENDPOINTS: "1",
  NODE_ENV: "production",
  // Spec 008: los archivos de documentos del E2E van aparte y fuera del repo.
  FILES_DIR: ".e2e-files",
};

export default defineConfig({
  testDir: "e2e",
  // Los ejecutores de GitHub son más lentos que un Mac.
  timeout: process.env.CI ? 240_000 : 120_000,
  expect: { timeout: process.env.CI ? 20_000 : 10_000 },
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", locale: "es-MX" },
  projects: [
    { name: "warmup", testMatch: /warmup\.setup\.ts/, use: { ...devices["Desktop Chrome"] } },
    { name: "chromium-desktop", dependencies: ["warmup"], use: { ...devices["Desktop Chrome"], viewport: { width: 1360, height: 950 } } },
    { name: "pixel-7", dependencies: ["warmup"], use: { ...devices["Pixel 7"] } },
    { name: "iphone-14", dependencies: ["warmup"], use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `node e2e/reset-db.mjs && pnpm exec next start --port ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    env,
  },
});
