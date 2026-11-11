// Contexto de servicios contra la BD de pruebas con adaptadores falsos (reloj controlable, hash rápido).
import { db, sql } from "@/db/client";
import { drizzleStore } from "@/server/adapters/drizzle/store";
import type { Ctx } from "@/server/services/context";
import { fakePorts, FakeClock } from "@tests/fakes";

export function makeCtx(clock = new FakeClock()): Ctx & { clock: FakeClock } {
  return { store: drizzleStore(db), ports: fakePorts(clock), clock };
}

export async function truncateAll() {
  const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' and tablename <> '__drizzle_migrations'`;
  if (rows.length) await sql.unsafe(`TRUNCATE ${rows.map((r) => `"${r.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

export const OWNER = { name: "Dueño de prueba", email: "dueno@mando.test", password: "secreta-123" };
