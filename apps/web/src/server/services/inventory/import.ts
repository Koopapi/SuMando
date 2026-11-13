// Importar la hoja «Inventario por áreas» (spec 006). Sin estado entre pasos, como el recetario (spec 004): la
// revisión analiza el archivo; la confirmación lo analiza de nuevo dentro de una transacción con el cerrojo del
// negocio y guarda proveedores, productos, presentaciones, mínimos, áreas con su lista y un conteo por área.
import type { Product } from "@/db/schema";
import { CATALOG_NAME_MAX, catalogKey } from "@/domain/catalog/names";
import { formatMilli, microToDb, milliToDb } from "@/domain/catalog/units";
import { countResult } from "@/domain/inventory/count";
import { dbToSignedMicro, signedMicroToDb } from "@/domain/inventory/quantities";
import { analyzeInventorySheets, type AnalyzedRow, type PlannedPresentation, type RowProblem, type RowWarning } from "@/domain/inventory/sheet-import";
import { readWorkbook } from "../../adapters/xlsx";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import { assertBranch, businessLock, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { applyMovement } from "./movements";
import { inventoryAccess, movableWarehouse, type InventoryAccess } from "./shared";

/** RF-5: la hoja de Sendero pesa 35 MB por sus fotos. */
export const IMPORT_MAX_BYTES = 40 * 1024 * 1024;

export interface ImportRowView {
  sheet: string;
  row: number;
  area: string;
  name: string;
  status: AnalyzedRow["status"];
  baseUnit: AnalyzedRow["baseUnit"];
  /** Presentaciones con su equivalencia en la unidad base («24»). */
  count: { name: string; factor: string } | null;
  purchase: { name: string; factor: string } | null;
  supplier: string | null;
  /** En la unidad base. */
  min: string | null;
  quantity: string | null;
  problems: RowProblem[];
  warnings: RowWarning[];
}

export interface ImportSummary {
  rows: number;
  newProducts: number;
  existingProducts: number;
  problems: number;
  newSuppliers: number;
  newAreas: number;
  areasCounted: number;
}

const pres = (p: PlannedPresentation | null) => (p ? { name: p.name, factor: formatMilli(p.factorMilli) } : null);

async function analyze(repos: Repos, scope: CatalogScope, access: InventoryAccess, warehouseId: string, file: Buffer) {
  const book = readWorkbook(file, { maxBytes: IMPORT_MAX_BYTES });
  const [products, areas, areaProducts, suppliers] = await Promise.all([
    repos.catalog.products.listByBusiness(access.businessId),
    repos.catalog.areas.listByBusiness(access.businessId),
    repos.inventory.areaProducts.listByBusiness(access.businessId),
    repos.catalog.suppliers.listByBusiness(access.businessId),
  ]);
  const branchAreas = areas.filter((a) => a.branchId === scope.active.branch.id && !a.archivedAt);
  const productArea = new Map<string, string>();
  for (const ap of areaProducts) {
    const a = areas.find((x) => x.id === ap.areaId);
    if (a && !a.archivedAt && a.warehouseId === warehouseId) productArea.set(ap.productId, a.id);
  }
  const active = products.filter((p) => !p.archivedAt);
  const result = analyzeInventorySheets(book.sheets, { products: active.map((p) => ({ id: p.id, nameKey: p.nameKey, baseUnit: p.baseUnit })), areas: branchAreas.map((a) => ({ id: a.id, nameKey: a.nameKey, warehouseId: a.warehouseId })), productArea }, warehouseId);
  // RF-8: un libro sin ninguna hoja con el encabezado no es la hoja esperada.
  if (!result.readable) throw new AppError("invalid_file");
  const ok = result.rows.filter((r) => r.status !== "problem");
  const supplierKeys = new Set(suppliers.filter((s) => !s.archivedAt).map((s) => s.nameKey));
  const areaKeys = new Set(branchAreas.map((a) => a.nameKey));
  const summary: ImportSummary = {
    rows: result.rows.length,
    newProducts: ok.filter((r) => r.status === "new").length,
    existingProducts: ok.filter((r) => r.status === "existing").length,
    problems: result.rows.length - ok.length,
    newSuppliers: new Set(ok.filter((r) => r.supplier && !supplierKeys.has(catalogKey(r.supplier))).map((r) => catalogKey(r.supplier!))).size,
    newAreas: new Set(ok.filter((r) => !areaKeys.has(r.areaKey)).map((r) => r.areaKey)).size,
    areasCounted: new Set(ok.filter((r) => r.quantityMilli !== null).map((r) => r.areaKey)).size,
  };
  return { rows: result.rows, ok, summary, products: active, areas: branchAreas, areaProducts, suppliers, productArea };
}

/** Permisos (RF-2, RF-3): catálogo del negocio, áreas de la sucursal y movimientos en el almacén elegido. */
async function guard(repos: Repos, scope: CatalogScope, warehouseId: unknown) {
  const access = await inventoryAccess(repos, scope);
  assertBranch(scope, access, scope.active.branch.id);
  const warehouse = movableWarehouse(scope, access, warehouseId);
  return { access, warehouse };
}

export async function reviewInventoryImport(ctx: Ctx, scope: CatalogScope, warehouseId: unknown, file: Buffer): Promise<{ summary: ImportSummary; rows: ImportRowView[] }> {
  const { access, warehouse } = await guard(ctx.store, scope, warehouseId);
  const { rows, summary } = await analyze(ctx.store, scope, access, warehouse.id, file);
  return {
    summary,
    rows: rows.map((r) => ({
      sheet: r.sheet,
      row: r.row,
      area: r.area,
      name: r.name,
      status: r.status,
      baseUnit: r.baseUnit,
      count: pres(r.count),
      purchase: pres(r.purchase),
      supplier: r.supplier,
      min: r.minMilli === null ? null : formatMilli(r.minMilli),
      quantity: r.quantityMilli === null ? null : formatMilli(r.quantityMilli),
      problems: r.problems,
      warnings: r.warnings,
    })),
  };
}

export interface ImportResult {
  created: number;
  completed: number;
  skipped: number;
  areasCounted: number;
}

export async function confirmInventoryImport(ctx: Ctx, scope: CatalogScope, warehouseId: unknown, file: Buffer, fileName: string): Promise<ImportResult> {
  readWorkbook(file, { maxBytes: IMPORT_MAX_BYTES });
  const now = ctx.ports.clock.now();
  const actor = scope.actor.id;
  return ctx.store.transaction(
    async (repos) => {
      const { access, warehouse } = await guard(repos, scope, warehouseId);
      const plan = await analyze(repos, scope, access, warehouse.id, file);
      // RF-24.
      if (plan.ok.length === 0) throw new AppError("import_empty");
      const businessId = access.businessId;
      const branchId = scope.active.branch.id;
      const audit = (action: string, entityType: Parameters<typeof recordAudit>[2]["entityType"], entityId: string, after: unknown, before?: unknown) =>
        recordAudit(repos.audit, now, { actorId: actor, action, entityType, entityId, businessId, branchId: entityType === "area" ? branchId : null, before, after });

      // RF-27: proveedores por nombre, o nuevos.
      const supplierIds = new Map(plan.suppliers.filter((s) => !s.archivedAt).map((s) => [s.nameKey, s.id]));
      for (const r of plan.ok) {
        if (!r.supplier) continue;
        const key = catalogKey(r.supplier);
        if (supplierIds.has(key)) continue;
        const name = r.supplier.slice(0, CATALOG_NAME_MAX);
        const s = await repos.catalog.suppliers.insert({ businessId, name, nameKey: catalogKey(name), phone: null, notes: null, createdBy: actor, createdAt: now });
        supplierIds.set(key, s.id);
        await audit("supplier.imported", "supplier", s.id, { name });
      }

      // RF-28 y RF-29: áreas por nombre en la sucursal, contadas en el almacén elegido.
      const areaIds = new Map(plan.areas.map((a) => [a.nameKey, a.id]));
      for (const a of plan.areas) {
        if (!a.warehouseId && plan.ok.some((r) => r.areaKey === a.nameKey)) await repos.catalog.areas.update(a.id, { warehouseId: warehouse.id, updatedAt: now });
      }
      for (const r of plan.ok) {
        if (areaIds.has(r.areaKey)) continue;
        const area = await repos.catalog.areas.insert({ businessId, branchId, name: r.area.slice(0, CATALOG_NAME_MAX), nameKey: r.areaKey, responsibleId: actor, createdBy: actor, createdAt: now });
        await repos.catalog.areas.update(area.id, { warehouseId: warehouse.id, updatedAt: now });
        areaIds.set(r.areaKey, area.id);
        await audit("area.imported", "area", area.id, { name: area.name, warehouseId: warehouse.id });
      }

      // RF-25 y RF-26: productos nuevos o completados.
      const productIds = new Map<string, string>();
      let created = 0;
      let completed = 0;
      for (const r of plan.ok) {
        const supplierId = r.supplier ? (supplierIds.get(catalogKey(r.supplier)) ?? null) : null;
        let product: Product;
        let presentations: { id: string; nameKey: string }[] = [];
        if (r.existingId) {
          product = plan.products.find((p) => p.id === r.existingId)!;
          presentations = (await repos.catalog.presentations.listByProduct(product.id)).map((p) => ({ id: p.id, nameKey: p.nameKey }));
          completed++;
        } else {
          product = await repos.catalog.products.insert({ businessId, name: r.name, nameKey: r.nameKey, baseUnit: r.baseUnit, supplierId, notes: null, createdBy: actor, createdAt: now });
          created++;
        }
        const ensure = async (p: PlannedPresentation | null) => {
          if (!p) return null;
          const key = catalogKey(p.name);
          const found = presentations.find((x) => x.nameKey === key);
          if (found) return found.id;
          const added = await repos.catalog.presentations.insert({ productId: product.id, name: p.name, nameKey: key, factor: milliToDb(p.factorMilli), createdBy: actor, createdAt: now });
          presentations.push({ id: added.id, nameKey: key });
          return added.id;
        };
        const countId = await ensure(r.count);
        const purchaseId = await ensure(r.purchase);
        const patch: Parameters<Repos["catalog"]["products"]["update"]>[1] = { updatedAt: now };
        if (countId && !product.countPresentationId) patch.countPresentationId = countId;
        if (purchaseId && !product.purchasePresentationId) patch.purchasePresentationId = purchaseId;
        if (supplierId && !product.supplierId) patch.supplierId = supplierId;
        if (Object.keys(patch).length > 1) product = await repos.catalog.products.update(product.id, patch);
        productIds.set(r.nameKey, product.id);
        // RF-31: el mínimo, si el producto no tiene uno en el almacén.
        if (r.minMilli !== null) {
          const level = await repos.catalog.levels.find(product.id, warehouse.id);
          if (!level?.minBase) await repos.catalog.levels.upsert({ businessId, productId: product.id, warehouseId: warehouse.id, minBase: microToDb(r.minMilli * 1000n), maxBase: level?.maxBase ?? null, updatedBy: actor, at: now });
        }
        await audit(r.existingId ? "product.completed_by_import" : "product.imported", "product", product.id, { name: product.name, baseUnit: product.baseUnit, count: r.count && pres(r.count), purchase: r.purchase && pres(r.purchase), supplierId: product.supplierId, minBase: r.minMilli === null ? null : formatMilli(r.minMilli) });
      }

      // RF-30: cada producto al final de la lista de su área, salvo que ya se cuente en otra área de ese almacén.
      for (const [areaKey, areaId] of areaIds) {
        const rows = plan.ok.filter((r) => r.areaKey === areaKey);
        if (!rows.length) continue;
        const current = plan.areaProducts.filter((ap) => ap.areaId === areaId).map((ap) => ap.productId);
        const added = rows.map((r) => productIds.get(r.nameKey)!).filter((id) => !current.includes(id) && !(plan.productArea.has(id) && plan.productArea.get(id) !== areaId));
        if (added.length) await repos.inventory.areaProducts.replace(areaId, [...current, ...added]);
      }

      // RF-32 y RF-33: un conteo por área con lo que trae cantidad.
      let areasCounted = 0;
      for (const [areaKey, areaId] of areaIds) {
        const lines = plan.ok.filter((r) => r.areaKey === areaKey && r.quantityMilli !== null).map((r) => ({ productId: productIds.get(r.nameKey)!, countedMicro: r.quantityMilli! * 1000n }));
        if (!lines.length) continue;
        const locked = await repos.inventory.stock.lock(businessId, warehouse.id, lines.map((l) => l.productId), now);
        const currentStock = new Map([...locked].map(([k, v]) => [k, dbToSignedMicro(v)]));
        const result = countResult(lines.map((l) => ({ ...l, seenMicro: currentStock.get(l.productId) ?? 0n })), currentStock);
        const count = await repos.inventory.counts.insert({
          businessId,
          branchId,
          areaId,
          warehouseId: warehouse.id,
          createdBy: actor,
          createdAt: now,
          lines: result.map((x) => ({ productId: x.productId, expectedBase: signedMicroToDb(x.expectedMicro), countedBase: signedMicroToDb(x.countedMicro), differenceBase: signedMicroToDb(x.differenceMicro) })),
        });
        const diffs = result.filter((x) => x.differenceMicro !== 0n);
        if (diffs.length) await applyMovement(repos, warehouse, { kind: "count", countId: count.id, note: fileName.slice(0, 200) || null, createdBy: actor, createdAt: now }, diffs.map((x) => ({ productId: x.productId, deltaMicro: x.differenceMicro })));
        areasCounted++;
      }

      const outcome = { created, completed, skipped: plan.rows.length - plan.ok.length, areasCounted };
      // RF-35: la importación misma, con el archivo.
      await audit("inventory.imported", "inventory_import", warehouse.id, { file: fileName, warehouseId: warehouse.id, ...outcome });
      return outcome;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}
