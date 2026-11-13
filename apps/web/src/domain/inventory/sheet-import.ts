// Análisis de las hojas «Inventario por áreas» (spec 006, RF-6, RF-7, RF-9, RF-15 a RF-22, RF-26, RF-29, RF-30).
// Puro: recibe las filas del Excel y una foto del catálogo, y devuelve qué haría la importación con cada producto.
import { CATALOG_NAME_MAX, catalogKey } from "../catalog/names";
import type { BaseUnit } from "../catalog/units";
import { normalizeName } from "../text";
import { sheetNumber, sheetUnit, toBaseMilli, type SheetUnit } from "./sheet-units";

export type RowProblem = "no_area" | "name_too_long" | "repeated" | "unit_mismatch" | "area_other_warehouse";
export type RowWarning = "no_purchase" | "invalid_quantity" | "invalid_minimum" | "in_other_area";

export interface PlannedPresentation {
  name: string;
  /** Equivalencia en milésimas de la unidad base. */
  factorMilli: bigint;
}

export interface AnalyzedRow {
  sheet: string;
  /** Fila del Excel (1 = la primera). */
  row: number;
  area: string;
  areaKey: string;
  name: string;
  nameKey: string;
  baseUnit: BaseUnit;
  count: PlannedPresentation | null;
  purchase: PlannedPresentation | null;
  supplier: string | null;
  /** Mínimo en milésimas de la unidad base. */
  minMilli: bigint | null;
  /** Cantidad contada en milésimas de la unidad base. */
  quantityMilli: bigint | null;
  status: "new" | "existing" | "problem";
  existingId: string | null;
  problems: RowProblem[];
  warnings: RowWarning[];
}

export interface CatalogProduct {
  id: string;
  nameKey: string;
  baseUnit: BaseUnit;
}

export interface CatalogArea {
  id: string;
  nameKey: string;
  warehouseId: string | null;
}

export interface CatalogSnapshot {
  /** Productos activos del negocio. */
  products: CatalogProduct[];
  /** Áreas activas de la sucursal. */
  areas: CatalogArea[];
  /** Producto → área activa donde ya se cuenta en el almacén elegido. */
  productArea: Map<string, string>;
}

export interface SheetInput {
  name: string;
  rows: string[][];
  /** Número de fila de Excel de cada fila; si falta, se cuentan desde 1. */
  numbers?: number[];
}

const header = (raw: string) => raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().replace(/\s+/g, " ").toUpperCase();
const COLUMNS = { area: "AREA", name: "ARTICULO", quantity: "CANT", unit: "UNIDAD", conversion: "CONVERSION", final: "PRESENTACION FINAL", supplier: "PROVEEDOR", min: "MINIMO" } as const;
type Columns = Partial<Record<keyof typeof COLUMNS, number>>;

/** RF-6: la fila de encabezado tiene al menos ÁREA, ARTÍCULO y UNIDAD. */
function findHeader(rows: string[][]): { at: number; cols: Columns } | null {
  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].map(header);
    const cols: Columns = {};
    for (const [k, v] of Object.entries(COLUMNS) as [keyof typeof COLUMNS, string][]) {
      const idx = cells.indexOf(v);
      if (idx >= 0) cols[k] = idx;
    }
    if (cols.area !== undefined && cols.name !== undefined && cols.unit !== undefined) return { at: i, cols };
  }
  return null;
}

/** RF-13 a RF-15: la presentación de compra, o null con o sin aviso. */
function purchaseOf(unit: SheetUnit, finalRaw: string, conversionRaw: string, count: PlannedPresentation | null): { purchase: PlannedPresentation | null; warn: boolean } {
  if (!finalRaw.trim()) return { purchase: null, warn: true };
  const final = sheetUnit(finalRaw);
  if (final.key === unit.key) return { purchase: null, warn: false };
  if (final.kind === "weight" || final.kind === "volume") {
    if (final.base !== unit.base) return { purchase: null, warn: true };
    if (final.factorMilli === 1000n) return { purchase: null, warn: false };
    if (count && count.factorMilli === final.factorMilli) return { purchase: null, warn: false };
    return { purchase: { name: final.label, factorMilli: final.factorMilli }, warn: false };
  }
  if (final.kind === "piece" && unit.base === "pz") return { purchase: null, warn: false };
  const conversion = sheetNumber(conversionRaw);
  const factorMilli = conversion === null ? 0n : toBaseMilli(conversion, unit.factorMilli);
  if (factorMilli <= 0n) return { purchase: null, warn: true };
  if (count && catalogKey(count.name) === catalogKey(final.label)) return { purchase: null, warn: false };
  return { purchase: { name: final.label, factorMilli }, warn: false };
}

/** RF-11 y RF-12: la presentación de conteo según la unidad de la hoja. */
function countOf(unit: SheetUnit): PlannedPresentation | null {
  if (unit.kind === "weight" || unit.kind === "volume") return unit.factorMilli === 1000n ? null : { name: unit.kind === "weight" ? "Kilogramo" : "Litro", factorMilli: unit.factorMilli };
  if (unit.kind === "other") return { name: unit.label, factorMilli: 1000n };
  return null;
}

/** Cantidad o mínimo: vacío o «/» = sin dato; otra cosa que no sea número = aviso. */
function amount(raw: string | undefined, factorMilli: bigint): { value: bigint | null; invalid: boolean } {
  const text = (raw ?? "").trim();
  if (text === "" || text === "/") return { value: null, invalid: false };
  const n = sheetNumber(text);
  return n === null ? { value: null, invalid: true } : { value: toBaseMilli(n, factorMilli), invalid: false };
}

export function analyzeInventorySheets(sheets: SheetInput[], catalog: CatalogSnapshot, warehouseId: string): { rows: AnalyzedRow[]; readable: boolean } {
  const out: AnalyzedRow[] = [];
  const seen = new Set<string>();
  let readable = false;
  const productByKey = new Map(catalog.products.map((p) => [p.nameKey, p]));
  const areaByKey = new Map(catalog.areas.map((a) => [a.nameKey, a]));
  for (const sheet of sheets) {
    const head = findHeader(sheet.rows);
    // RF-7: hojas sin el encabezado, fuera.
    if (!head) continue;
    readable = true;
    const cell = (r: string[], k: keyof typeof COLUMNS) => (head.cols[k] === undefined ? "" : (r[head.cols[k]!] ?? ""));
    for (let i = head.at + 1; i < sheet.rows.length; i++) {
      const r = sheet.rows[i];
      const name = normalizeName(cell(r, "name"));
      // RF-7: filas de título de grupo y sin artículo, fuera.
      if (!name) continue;
      const area = normalizeName(cell(r, "area"));
      const unit = sheetUnit(cell(r, "unit"));
      const count = countOf(unit);
      const { purchase, warn } = purchaseOf(unit, cell(r, "final"), cell(r, "conversion"), count);
      const nameKey = catalogKey(name);
      const areaKey = catalogKey(area);
      const problems: RowProblem[] = [];
      const warnings: RowWarning[] = [];
      if (warn) warnings.push("no_purchase");
      const qty = amount(cell(r, "quantity"), unit.factorMilli);
      if (qty.invalid) warnings.push("invalid_quantity");
      // RF-31: el mínimo va en la presentación final si se creó; si no, en la unidad de la hoja.
      const min = amount(cell(r, "min"), purchase ? purchase.factorMilli : unit.factorMilli);
      if (min.invalid) warnings.push("invalid_minimum");
      if (!area) problems.push("no_area");
      if (name.length > CATALOG_NAME_MAX) problems.push("name_too_long");
      if (seen.has(nameKey)) problems.push("repeated");
      seen.add(nameKey);
      const existing = productByKey.get(nameKey);
      if (existing && existing.baseUnit !== unit.base) problems.push("unit_mismatch");
      const existingArea = areaByKey.get(areaKey);
      if (existingArea?.warehouseId && existingArea.warehouseId !== warehouseId) problems.push("area_other_warehouse");
      if (existing) {
        const current = catalog.productArea.get(existing.id);
        if (current && current !== existingArea?.id) warnings.push("in_other_area");
      }
      out.push({
        sheet: sheet.name,
        row: sheet.numbers?.[i] ?? i + 1,
        area,
        areaKey,
        name,
        nameKey,
        baseUnit: unit.base,
        count,
        purchase,
        supplier: normalizeName(cell(r, "supplier")) || null,
        minMilli: min.value,
        quantityMilli: qty.value,
        status: problems.length ? "problem" : existing ? "existing" : "new",
        existingId: existing?.id ?? null,
        problems,
        warnings,
      });
    }
  }
  return { rows: out, readable };
}
