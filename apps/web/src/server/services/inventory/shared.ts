// Reglas comunes del inventario (spec 005): todo ocurre en los almacenes visibles desde la sucursal activa (RF-2),
// con el permiso comprobado en el servidor (RF-3 a RF-5) y sin aceptar nada archivado (RF-6).
import type { Product, ProductPresentation, Warehouse } from "@/db/schema";
import { dbToMilli } from "@/domain/catalog/units";
import { canMoveInWarehouse } from "@/domain/inventory/access";
import { linesProblem } from "@/domain/inventory/movement";
import { lineToBase, parseLineQuantity } from "@/domain/inventory/quantities";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { catalogAccess, type CatalogAccess, type CatalogScope } from "../catalog/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Un identificador que no es uuid no existe (y no llega a la base). */
export function uuidOrNotFound(id: unknown): string {
  if (typeof id !== "string" || !UUID.test(id)) throw new AppError("not_found");
  return id;
}

export interface InventoryAccess extends CatalogAccess {
  /** Almacenes de la sucursal activa y del negocio completo, también los archivados (RF-2). */
  visible: Warehouse[];
}

export async function inventoryAccess(repos: Repos, scope: CatalogScope): Promise<InventoryAccess> {
  const access = await catalogAccess(repos, scope);
  const all = await repos.catalog.warehouses.listByBusiness(access.businessId);
  return { ...access, visible: all.filter((w) => w.branchId === null || w.branchId === scope.active.branch.id) };
}

/** Un almacén fuera de los visibles no existe para quien pregunta (RF-5). */
export function visibleWarehouse(access: InventoryAccess, id: unknown): Warehouse {
  const wh = access.visible.find((w) => w.id === id);
  if (!wh) throw new AppError("not_found");
  return wh;
}

/** RF-3, RF-4 y RF-6: quien registra debe poder mover en el almacén, y el almacén debe estar activo. */
export function movableWarehouse(scope: CatalogScope, access: InventoryAccess, id: unknown): Warehouse {
  const wh = visibleWarehouse(access, id);
  if (!canMoveInWarehouse(scope.actor, access.memberships, access.branches, wh)) throw new AppError("not_found");
  if (wh.archivedAt) throw new AppError("archived_item", { name: wh.name });
  return wh;
}

export interface Book {
  products: Map<string, Product>;
  presentations: Map<string, ProductPresentation>;
}

export async function loadBook(repos: Repos, businessId: string): Promise<Book> {
  const [products, presentations] = await Promise.all([repos.catalog.products.listByBusiness(businessId), repos.catalog.presentations.listByBusiness(businessId)]);
  return { products: new Map(products.map((p) => [p.id, p])), presentations: new Map(presentations.map((p) => [p.id, p])) };
}

/** Equivalencia (milésimas) de la presentación de conteo del producto; la unidad base vale 1 (RF-9). */
export function countFactor(book: Book, product: Product): { name: string | null; factorMilli: bigint } {
  const p = product.countPresentationId ? book.presentations.get(product.countPresentationId) : undefined;
  return p ? { name: p.name, factorMilli: dbToMilli(p.factor) } : { name: null, factorMilli: 1000n };
}

/** Producto activo del negocio (RF-6); de otro negocio no existe. */
export function activeProduct(book: Book, id: unknown): Product {
  const product = typeof id === "string" ? book.products.get(id) : undefined;
  if (!product) throw new AppError("not_found");
  if (product.archivedAt) throw new AppError("archived_item", { name: product.name });
  return product;
}

/** Equivalencia de la presentación elegida para el producto; nula o ausente = la unidad base (RF-7). */
export function presentationFactor(book: Book, product: Product, presentationId: unknown): bigint {
  if (presentationId === null || presentationId === undefined || presentationId === "") return 1000n;
  const p = typeof presentationId === "string" ? book.presentations.get(presentationId) : undefined;
  if (!p || p.productId !== product.id) throw new AppError("not_found");
  return dbToMilli(p.factor);
}

export interface LineInput {
  productId: string;
  presentationId?: string | null;
  quantity: string;
}

/** Renglones validados y convertidos a unidad base (RF-7, RF-8, RF-10). */
export function parseLines(book: Book, raw: unknown, parse: (q: string) => bigint | null = parseLineQuantity, invalid: "invalid_line_quantity" | "invalid_adjustment" = "invalid_line_quantity"): { product: Product; baseMicro: bigint }[] {
  if (!Array.isArray(raw)) throw new AppError("validation");
  const lines = raw.map((l) => {
    const { productId, presentationId, quantity } = (l ?? {}) as Record<string, unknown>;
    if (typeof productId !== "string" || typeof quantity !== "string") throw new AppError("validation");
    return { productId, presentationId, quantity };
  });
  const problem = linesProblem(lines);
  if (problem?.code === "duplicate_line") throw new AppError("duplicate_line", { product: book.products.get(lines[problem.index].productId)?.name ?? "" });
  if (problem) throw new AppError(problem.code);
  return lines.map((l) => {
    const product = activeProduct(book, l.productId);
    const qty = parse(l.quantity);
    if (qty === null) throw new AppError(invalid);
    return { product, baseMicro: lineToBase(qty, presentationFactor(book, product, l.presentationId)) };
  });
}

export function optionalText(raw: unknown, max: number): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "string") throw new AppError("validation");
  const text = raw.trim().replace(/\s+/g, " ");
  if (text.length > max) throw new AppError("validation");
  return text || null;
}
