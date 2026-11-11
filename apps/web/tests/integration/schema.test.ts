// Spec 001, modelo de datos (plan, sección 2): la migración inicial crea las seis tablas.
import { describe, expect, it } from "vitest";
import { sql } from "@/db/client";

describe("spec 001 — esquema", () => {
  it("test_s001_esquema_la_migracion_inicial_crea_las_seis_tablas", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`;
    const names = rows.map((r) => r.tablename).filter((n) => n !== "__drizzle_migrations");
    expect(names).toEqual(["audit_log", "branches", "businesses", "memberships", "sessions", "users"]);
  });

  it("test_s001_esquema_el_correo_y_las_claves_de_nombre_son_unicos", async () => {
    const idx = await sql<{ indexname: string }[]>`select indexname from pg_indexes where schemaname = 'public' order by indexname`;
    const names = idx.map((r) => r.indexname);
    expect(names).toContain("users_email_unique");
    expect(names).toContain("businesses_name_key_unique");
    expect(names).toContain("branches_business_name_key_unique");
    expect(names).toContain("memberships_user_branch_unique");
    expect(names).toContain("sessions_token_hash_unique");
  });
});
