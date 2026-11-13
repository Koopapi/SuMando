// Spec 001, modelo de datos (plan, sección 2): la migración inicial crea las seis tablas.
import { describe, expect, it } from "vitest";
import { sql } from "@/db/client";

describe("spec 001 — esquema", () => {
  it("test_s001_esquema_la_migracion_inicial_crea_las_seis_tablas", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public' order by tablename`;
    const names = rows.map((r) => r.tablename).filter((n) => n !== "__drizzle_migrations");
    expect(names).toEqual(expect.arrayContaining(["audit_log", "branches", "businesses", "memberships", "sessions", "users"]));
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

describe("spec 004 — esquema", () => {
  it("test_s004_rf1_las_tablas_del_recetario_existen", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(
      expect.arrayContaining(["recipes", "recipe_ingredients", "supply_calculations", "supply_calculation_items", "supply_calculation_lines", "recipe_templates", "recipe_template_items"]),
    );
  });

  it("test_s004_rf2_calculos_y_plantillas_llevan_sucursal_obligatoria", async () => {
    const cols = await sql<{ table_name: string; is_nullable: string }[]>`
      select table_name, is_nullable from information_schema.columns
      where column_name = 'branch_id' and table_name in ('supply_calculations', 'recipe_templates')`;
    expect(cols).toHaveLength(2);
    expect(cols.every((c) => c.is_nullable === "NO")).toBe(true);
  });

  it("test_s004_rf49_nombres_unicos_solo_entre_los_activos", async () => {
    const idx = await sql<{ indexname: string; indexdef: string }[]>`select indexname, indexdef from pg_indexes where indexname in ('recipes_active_name_unique', 'recipe_templates_active_name_unique', 'recipe_ingredients_recipe_product_unique')`;
    expect(idx).toHaveLength(3);
    expect(idx.filter((i) => i.indexname.includes("active")).every((i) => /archived_at IS NULL/i.test(i.indexdef))).toBe(true);
  });

  it("test_s004_rf18_la_base_rechaza_porcentajes_fuera_de_rango", async () => {
    const checks = await sql<{ conname: string }[]>`select conname from pg_constraint where conname in ('recipes_half_percent_range', 'recipe_ingredients_quantity_positive', 'supply_calculation_items_counts')`;
    expect(checks).toHaveLength(3);
  });
});
