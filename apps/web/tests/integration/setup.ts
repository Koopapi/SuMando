// Antes de cada archivo de tests: la app apunta a la BD de pruebas y no a la de desarrollo; cada test empieza vacío.
import { afterAll, beforeEach } from "vitest";
import { TEST_URL } from "./global-setup";

process.env.DATABASE_URL = TEST_URL;
process.env.DEV_ENDPOINTS = "1";

beforeEach(async () => {
  const { truncateAll } = await import("./helpers");
  await truncateAll();
});

afterAll(async () => {
  const { sql } = await import("@/db/client");
  await sql.end({ timeout: 2 });
});
