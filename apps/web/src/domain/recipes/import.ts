// Análisis de un recetario en hoja de cálculo (spec 004, RF-40 a RF-46). Regla pura: recibe las hojas ya leídas,
// los productos activos del catálogo y las claves de las recetas activas, y devuelve cada platillo listo para
// guardar o con sus problemas. Formato (el del recetario de Pirrus): nombre en la primera celda; encabezado
// «Ingredientes, Cantidad bruta, Unidad, Nota»; un ingrediente por fila; después, las filas de una sola columna
// son el modo de preparación.
import { CATALOG_NAME_MAX, catalogKey } from "../catalog/names";
import { parseMilli, toBaseMicro, type BaseUnit } from "../catalog/units";
import { normalizeName } from "../text";
import { NOTE_MAX, PREPARATION_MAX } from "./recipe";

export interface ImportProduct {
  id: string;
  name: string;
  baseUnit: BaseUnit;
}

export type ImportProblem =
  | { code: "no_name" | "name_too_long" | "no_header" | "no_ingredients" | "preparation_too_long" }
  | { code: "missing_product" | "repeated_ingredient" | "note_too_long"; ingredient: string }
  | { code: "unknown_unit"; ingredient: string; unit: string }
  | { code: "invalid_quantity"; ingredient: string; value: string }
  | { code: "unit_mismatch"; ingredient: string; sheetUnit: BaseUnit; productUnit: BaseUnit };

export interface ImportedRecipe {
  name: string;
  preparation: string | null;
  ingredients: { productId: string; quantityMicro: bigint; note: string | null }[];
}

export interface ImportDish {
  sheet: string;
  name: string;
  status: "ready" | "problems" | "exists" | "duplicate";
  problems: ImportProblem[];
  recipe?: ImportedRecipe;
}

const UNITS: Record<string, BaseUnit> = { gramos: "g", gramo: "g", mililitros: "ml", mililitro: "ml", piezas: "pz", pieza: "pz" };
const HEADER = ["ingredientes", "cantidad bruta", "unidad"];

const cell = (row: string[] | undefined, i: number) => normalizeName(row?.[i] ?? "");

function analyzeSheet(sheet: { name: string; rows: string[][] }, byKey: Map<string, ImportProduct>): Omit<ImportDish, "status"> {
  const name = cell(sheet.rows[0], 0);
  const problems: ImportProblem[] = [];
  if (!name) problems.push({ code: "no_name" });
  else if (name.length > CATALOG_NAME_MAX) problems.push({ code: "name_too_long" });
  const header = sheet.rows[1] ?? [];
  if (HEADER.some((h, i) => catalogKey(header[i] ?? "") !== h)) {
    problems.push({ code: "no_header" });
    return { sheet: sheet.name, name, problems };
  }
  const ingredients: ImportedRecipe["ingredients"] = [];
  const seen = new Set<string>();
  let i = 2;
  for (; i < sheet.rows.length; i++) {
    const row = sheet.rows[i];
    if (!row.slice(1).some((c) => c.trim() !== "")) break;
    const ingredient = cell(row, 0);
    const value = cell(row, 1);
    const unitText = cell(row, 2);
    const note = cell(row, 3) || null;
    const product = byKey.get(catalogKey(ingredient));
    const unit = UNITS[catalogKey(unitText)];
    const qty = parseMilli(value);
    const before = problems.length;
    if (!product) problems.push({ code: "missing_product", ingredient });
    if (!unit) problems.push({ code: "unknown_unit", ingredient, unit: unitText });
    else if (product && product.baseUnit !== unit) problems.push({ code: "unit_mismatch", ingredient, sheetUnit: unit, productUnit: product.baseUnit });
    if (qty === null || qty === 0n) problems.push({ code: "invalid_quantity", ingredient, value });
    if (note && note.length > NOTE_MAX) problems.push({ code: "note_too_long", ingredient });
    if (product && seen.has(product.id)) problems.push({ code: "repeated_ingredient", ingredient });
    if (product) seen.add(product.id);
    if (problems.length === before && product && qty) ingredients.push({ productId: product.id, quantityMicro: toBaseMicro(qty, 1000n), note });
  }
  if (i === 2) problems.push({ code: "no_ingredients" });
  const steps = sheet.rows
    .slice(i)
    .map((r) => r.join(" ").trim())
    .filter(Boolean);
  const preparation = steps.length ? steps.join("\n") : null;
  if (preparation && preparation.length > PREPARATION_MAX) problems.push({ code: "preparation_too_long" });
  return { sheet: sheet.name, name, problems, ...(problems.length ? {} : { recipe: { name, preparation, ingredients } }) };
}

export function analyzeSheets(sheets: { name: string; rows: string[][] }[], products: ImportProduct[], existingKeys: Iterable<string>): ImportDish[] {
  const byKey = new Map(products.map((p) => [catalogKey(p.name), p]));
  const existing = new Set(existingKeys);
  const inFile = new Set<string>();
  return sheets.map((sheet) => {
    const dish = analyzeSheet(sheet, byKey);
    const key = catalogKey(dish.name);
    if (dish.name && existing.has(key)) return { sheet: dish.sheet, name: dish.name, status: "exists", problems: [] };
    if (dish.name && inFile.has(key)) return { sheet: dish.sheet, name: dish.name, status: "duplicate", problems: [] };
    if (dish.name) inFile.add(key);
    return { ...dish, status: dish.problems.length ? "problems" : "ready" };
  });
}
