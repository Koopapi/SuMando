import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "postgres://localhost:5432/mando_dev";

// Una sola conexión por proceso, también con la recarga en caliente de `next dev`.
const g = globalThis as { __mandoSql?: ReturnType<typeof postgres> };
export const sql = g.__mandoSql ?? (g.__mandoSql = postgres(url, { max: 10, onnotice: () => {} }));
export const db = drizzle(sql, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
