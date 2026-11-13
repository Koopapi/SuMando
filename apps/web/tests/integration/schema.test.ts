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

describe("spec 005 — esquema", () => {
  it("test_s005_rf1_las_tablas_del_inventario_existen", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(
      expect.arrayContaining(["stock", "inventory_movements", "inventory_movement_lines", "inventory_transfers", "inventory_transfer_lines", "inventory_counts", "inventory_count_lines", "area_products", "product_links"]),
    );
    const idx = await sql<{ indexname: string }[]>`select indexname from pg_indexes where indexname in ('stock_warehouse_product_unique', 'inventory_movements_reverses_unique', 'area_products_area_product_unique', 'product_links_from_business_unique')`;
    expect(idx).toHaveLength(4);
  });

  it("test_s005_rf53_el_conteo_guarda_esperado_contado_y_diferencia", async () => {
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'inventory_count_lines'`;
    expect(cols.map((c) => c.column_name)).toEqual(expect.arrayContaining(["expected_base", "counted_base", "difference_base"]));
  });

  it("test_s005_rf60_cada_movimiento_guarda_tipo_almacen_autor_y_fecha", async () => {
    const cols = await sql<{ column_name: string; is_nullable: string }[]>`select column_name, is_nullable from information_schema.columns where table_name = 'inventory_movements'`;
    const required = cols.filter((c) => c.is_nullable === "NO").map((c) => c.column_name);
    expect(required).toEqual(expect.arrayContaining(["kind", "warehouse_id", "business_id", "created_by", "created_at"]));
  });

  it("test_s005_rf63_un_movimiento_solo_se_cancela_una_vez", async () => {
    const [def] = await sql<{ indexdef: string }[]>`select indexdef from pg_indexes where indexname = 'inventory_movements_reverses_unique'`;
    expect(def.indexdef).toContain("UNIQUE");
    const checks = await sql<{ conname: string }[]>`select conname from pg_constraint where conname in ('inventory_transfers_distinct', 'inventory_movements_kind_check', 'inventory_count_lines_counted_non_negative')`;
    expect(checks).toHaveLength(3);
  });
});

describe("spec 007 — esquema", () => {
  it("test_s007_rf1_las_tablas_de_requisiciones_existen", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(expect.arrayContaining(["requisitions", "requisition_lines", "requisition_groups", "requisition_events", "purchase_templates", "purchase_template_items"]));
  });

  it("test_s007_rf2_el_folio_es_unico_por_negocio", async () => {
    const [idx] = await sql<{ indexdef: string }[]>`select indexdef from pg_indexes where indexname = 'requisitions_business_folio_unique'`;
    expect(idx.indexdef).toContain("UNIQUE");
  });

  it("test_s007_rf7_cada_renglon_guarda_cantidad_solicitada_vigente_y_recibida", async () => {
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'requisition_lines'`;
    expect(cols.map((c) => c.column_name)).toEqual(expect.arrayContaining(["requested_base", "quantity_base", "received_base", "supplier_id", "amount_cents", "close_reason"]));
  });

  it("test_s007_rf44_cada_paso_queda_en_el_historial", async () => {
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'requisition_events'`;
    expect(cols.map((c) => c.column_name)).toEqual(expect.arrayContaining(["kind", "actor_id", "at", "detail"]));
  });

  it("test_s007_rf45_la_entrada_de_inventario_guarda_su_requisicion", async () => {
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'inventory_movements' and column_name = 'requisition_id'`;
    expect(cols).toHaveLength(1);
  });
});

describe("spec 008 — esquema", () => {
  it("test_s008_rf1_las_tablas_de_personal_existen", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(expect.arrayContaining(["positions", "employees", "employee_periods", "document_types", "employee_files"]));
  });

  it("test_s008_rf15_rf33_un_solo_periodo_abierto_y_la_baja_no_antes_del_ingreso", async () => {
    const idx = await sql<{ indexname: string }[]>`select indexname from pg_indexes where indexname in ('employee_periods_open_unique', 'employee_files_storage_key_unique')`;
    expect(idx).toHaveLength(2);
    const checks = await sql<{ conname: string }[]>`select conname from pg_constraint where conname in ('employee_periods_dates', 'employees_pay_positive')`;
    expect(checks).toHaveLength(2);
  });

  it("test_s008_rf26_los_archivos_no_se_borran_se_reemplazan_o_retiran", async () => {
    const cols = await sql<{ column_name: string }[]>`select column_name from information_schema.columns where table_name = 'employee_files'`;
    expect(cols.map((c) => c.column_name)).toEqual(expect.arrayContaining(["replaced_at", "retired_at", "retire_reason", "storage_key"]));
  });
});

describe("spec 009 — esquema", () => {
  it("test_s009_rf1_una_semana_por_sucursal_y_lunes", async () => {
    const rows = await sql<{ tablename: string }[]>`select tablename from pg_tables where schemaname = 'public'`;
    expect(rows.map((r) => r.tablename)).toEqual(expect.arrayContaining(["payroll_weeks", "payroll_lines", "payroll_days", "loans", "loan_payments"]));
    const idx = await sql<{ indexname: string }[]>`select indexname from pg_indexes where indexname in ('payroll_weeks_branch_start_unique', 'payroll_lines_week_employee_unique', 'payroll_days_line_day_unique', 'loan_payments_loan_week_unique')`;
    expect(idx).toHaveLength(4);
  });

  it("test_s009_rf20_la_base_rechaza_montos_negativos_y_semanas_que_no_empiezan_en_lunes", async () => {
    const checks = await sql<{ conname: string }[]>`select conname from pg_constraint where conname in ('payroll_weeks_monday', 'payroll_lines_amounts', 'payroll_days_day_range', 'loans_amounts', 'loan_payments_amount')`;
    expect(checks).toHaveLength(5);
  });

  it("test_s009_rf27_el_saldo_del_prestamo_no_pasa_del_monto_ni_baja_de_cero", async () => {
    const [c] = await sql<{ def: string }[]>`select pg_get_constraintdef(oid) as def from pg_constraint where conname = 'loans_amounts'`;
    expect(c.def).toMatch(/balance_cents >= 0/);
    expect(c.def).toMatch(/balance_cents <= amount_cents/);
  });
});

