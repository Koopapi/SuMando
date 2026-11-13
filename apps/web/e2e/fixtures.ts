// Cada test empieza con la BD vacía (sin borrar las migraciones) y con el reloj de pruebas en la hora real.
import { test as base, expect } from "@playwright/test";
import postgres from "postgres";
import { BASE, DB } from "./warm";

async function resetData() {
  const sql = postgres(DB, { max: 1, onnotice: () => {} });
  try {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`;
    if (rows.length) await sql.unsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
  } finally {
    await sql.end();
  }
  await fetch(`${BASE}/api/dev/clock`, { method: "DELETE" }).catch(() => undefined);
}

export const test = base.extend<{ cleanDb: void }>({
  cleanDb: [
    async ({}, use) => {
      await resetData();
      await use();
    },
    { auto: true },
  ],
});

export { expect };
