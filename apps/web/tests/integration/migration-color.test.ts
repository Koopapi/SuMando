// Spec 002, RF-10: la migración del color rellena los negocios que ya existían. Usa una BD propia para aplicar la
// migración 0000, sembrar negocios como los dejó la spec 001 y luego aplicar la 0001.
import { readFileSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_URL } from "./global-setup";

const DB = "mando_migtest";
const URL = TEST_URL.replace(/\/[^/]+$/, `/${DB}`);
const ADMIN = TEST_URL.replace(/\/[^/]+$/, "/postgres");
const migration = (file: string) => readFileSync(path.resolve(import.meta.dirname, "../../drizzle", file), "utf8").split("--> statement-breakpoint");

let sql: postgres.Sql;

beforeAll(async () => {
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${DB}`);
  await admin.end();
  sql = postgres(URL, { max: 1, onnotice: () => {} });
  for (const stmt of migration("0000_esqueleto.sql")) await sql.unsafe(stmt);
});

afterAll(async () => {
  await sql.end();
  const admin = postgres(ADMIN, { max: 1, onnotice: () => {} });
  await admin.unsafe(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
  await admin.end();
});

describe("spec 002 — migración del color de negocio", () => {
  it("test_s002_rf10_la_migracion_asigna_colores_a_los_negocios_existentes", async () => {
    for (let i = 1; i <= 10; i++) {
      await sql`insert into businesses (name, name_key, created_at, updated_at) values (${`Negocio ${i}`}, ${`negocio ${i}`}, ${new Date(Date.UTC(2026, 10, i))}, now())`;
    }
    for (const stmt of migration("0001_color_negocio.sql")) await sql.unsafe(stmt);
    const rows = await sql<{ name: string; color: string }[]>`select name, color from businesses order by created_at`;
    expect(rows.map((r) => r.color)).toEqual(["violeta", "rojo", "naranja", "ambar", "verde", "turquesa", "azul", "rosa", "violeta", "violeta"]);
  });

  it("test_s002_rf8_la_base_de_datos_rechaza_un_color_fuera_de_la_paleta_o_vacio", async () => {
    await expect(sql`insert into businesses (name, name_key, color, created_at, updated_at) values ('X', 'x', 'morado', now(), now())`).rejects.toThrow(/businesses_color_check/);
    await expect(sql`insert into businesses (name, name_key, created_at, updated_at) values ('Y', 'y', now(), now())`).rejects.toThrow(/null/);
  });
});
