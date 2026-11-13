// Entradas, salidas, ajustes, cancelaciones e historial (spec 005, RF-11 a RF-20, RF-60 a RF-66). Cada movimiento
// cambia la existencia en la misma transacción en que se guarda; nada se modifica ni se borra.
import type { InventoryMovement, MovementKind, Warehouse } from "@/db/schema";
import { exitReasonProblem, NOTE_MAX, REFERENCE_MAX, writtenReason } from "@/domain/inventory/movement";
import { dbToSignedMicro, formatStock, parseAdjustment, signedMicroToDb } from "@/domain/inventory/quantities";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import type { MovementCursor } from "../../ports/inventory";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { isUniqueViolation } from "../validation";
import { uuidOrNotFound, countFactor, inventoryAccess, loadBook, movableWarehouse, optionalText, parseLines, visibleWarehouse, type Book, type InventoryAccess } from "./shared";
import type { HistoryEntryView, MovementSummaryView, MovementView } from "./views";

export interface MovementInput {
  kind: unknown;
  warehouseId: unknown;
  lines: unknown;
  supplierId?: unknown;
  reference?: unknown;
  note?: unknown;
  reason?: unknown;
}

/** Aplica los cambios a la existencia y guarda el movimiento con la existencia que dejó cada renglón. */
export async function applyMovement(
  repos: Repos,
  wh: Warehouse,
  data: { kind: MovementKind; createdBy: string; createdAt: Date; reason?: string | null; supplierId?: string | null; reference?: string | null; note?: string | null; transferId?: string | null; countId?: string | null; reversesId?: string | null; requisitionId?: string | null },
  deltas: { productId: string; deltaMicro: bigint }[],
): Promise<InventoryMovement> {
  const balances = await repos.inventory.stock.apply(
    wh.businessId,
    wh.id,
    deltas.map((d) => ({ productId: d.productId, deltaBase: signedMicroToDb(d.deltaMicro) })),
    data.createdAt,
  );
  return repos.inventory.movements.insert({
    ...data,
    businessId: wh.businessId,
    branchId: wh.branchId,
    warehouseId: wh.id,
    lines: deltas.map((d) => ({ productId: d.productId, deltaBase: signedMicroToDb(d.deltaMicro), balanceAfter: balances.get(d.productId)! })),
  });
}

export async function recordMovement(ctx: Ctx, scope: CatalogScope, input: MovementInput): Promise<InventoryMovement> {
  const kind = input.kind;
  if (kind !== "entry" && kind !== "exit" && kind !== "adjustment") throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const wh = movableWarehouse(scope, access, input.warehouseId);
    const book = await loadBook(repos, access.businessId);
    const base = { kind: kind as MovementKind, createdBy: scope.actor.id, createdAt: now };
    if (kind === "adjustment") {
      // RF-18 y RF-19: un producto, cantidad con signo distinta de cero y motivo escrito.
      const lines = parseLines(book, input.lines, parseAdjustment, "invalid_adjustment");
      if (lines.length !== 1) throw new AppError("validation");
      const reason = writtenReason(typeof input.note === "string" ? input.note : null);
      if (!reason) throw new AppError("reason_required");
      return applyMovement(repos, wh, { ...base, note: reason }, [{ productId: lines[0].product.id, deltaMicro: lines[0].baseMicro }]);
    }
    const lines = parseLines(book, input.lines);
    const note = optionalText(input.note, NOTE_MAX);
    if (kind === "exit") {
      // RF-15 y RF-16.
      const problem = exitReasonProblem(input.reason, note);
      if (problem) throw new AppError(problem);
      return applyMovement(repos, wh, { ...base, reason: input.reason as string, note }, lines.map((l) => ({ productId: l.product.id, deltaMicro: -l.baseMicro })));
    }
    // RF-12: proveedor activo del mismo negocio, referencia y nota opcionales.
    let supplierId: string | null = null;
    if (input.supplierId !== undefined && input.supplierId !== null && input.supplierId !== "") {
      const supplier = await repos.catalog.suppliers.findById(uuidOrNotFound(input.supplierId));
      if (!supplier || supplier.businessId !== access.businessId) throw new AppError("not_found");
      if (supplier.archivedAt) throw new AppError("archived_item", { name: supplier.name });
      supplierId = supplier.id;
    }
    const reference = optionalText(input.reference, REFERENCE_MAX);
    return applyMovement(repos, wh, { ...base, supplierId, reference, note }, lines.map((l) => ({ productId: l.product.id, deltaMicro: l.baseMicro })));
  });
}

const CANCELLABLE: MovementKind[] = ["entry", "exit", "adjustment"];

/** Un movimiento de un almacén visible; de otro, no existe (RF-5). */
async function visibleMovement(repos: Repos, access: InventoryAccess, id: string): Promise<InventoryMovement> {
  const m = await repos.inventory.movements.findById(uuidOrNotFound(id));
  if (!m || !access.visible.some((w) => w.id === m.warehouseId)) throw new AppError("not_found");
  return m;
}

/** RF-64 a RF-66: el inverso con motivo; conteos, traspasos y lo ya cancelado no se cancelan aquí. */
export async function cancelMovement(ctx: Ctx, scope: CatalogScope, id: string, rawReason: unknown): Promise<InventoryMovement> {
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : null);
  if (!reason) throw new AppError("reason_required");
  const now = ctx.ports.clock.now();
  try {
    return await ctx.store.transaction(async (repos) => {
      const access = await inventoryAccess(repos, scope);
      const m = await visibleMovement(repos, access, id);
      if (!CANCELLABLE.includes(m.kind) || (await repos.inventory.movements.reversalOf(m.id))) throw new AppError("not_cancellable");
      const wh = movableWarehouse(scope, access, m.warehouseId);
      const book = await loadBook(repos, access.businessId);
      const lines = await repos.inventory.movements.lines(m.id);
      for (const l of lines) {
        const p = book.products.get(l.productId)!;
        if (p.archivedAt) throw new AppError("archived_item", { name: p.name });
      }
      return applyMovement(repos, wh, { kind: "reversal", reversesId: m.id, note: reason, createdBy: scope.actor.id, createdAt: now }, lines.map((l) => ({ productId: l.productId, deltaMicro: -dbToSignedMicro(l.deltaBase) })));
    });
  } catch (e) {
    // Dos cancelaciones a la vez: el índice único deja pasar solo una.
    if (isUniqueViolation(e)) throw new AppError("not_cancellable");
    throw e;
  }
}

function show(book: Book, productId: string, micro: bigint) {
  const p = book.products.get(productId)!;
  return formatStock(micro, countFactor(book, p).factorMilli);
}

export async function movementDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<MovementView> {
  const access = await inventoryAccess(ctx.store, scope);
  const m = await visibleMovement(ctx.store, access, id);
  const [book, lines, reversal, users] = await Promise.all([loadBook(ctx.store, access.businessId), ctx.store.inventory.movements.lines(m.id), ctx.store.inventory.movements.reversalOf(m.id), ctx.store.users.list()]);
  const nameOf = (userId: string) => users.find((u) => u.id === userId)?.name ?? "";
  const supplier = m.supplierId ? await ctx.store.catalog.suppliers.findById(m.supplierId) : null;
  const wh = visibleWarehouse(access, m.warehouseId);
  return {
    id: m.id,
    kind: m.kind,
    warehouse: { id: wh.id, name: wh.name },
    reason: m.reason,
    supplier: supplier?.name ?? null,
    reference: m.reference,
    note: m.note,
    createdAt: m.createdAt.toISOString(),
    author: nameOf(m.createdBy),
    transferId: m.transferId,
    countId: m.countId,
    reverses: m.reversesId,
    reversal: reversal ? { id: reversal.id, createdAt: reversal.createdAt.toISOString(), author: nameOf(reversal.createdBy), reason: reversal.note } : null,
    cancellable: CANCELLABLE.includes(m.kind) && !reversal && !wh.archivedAt,
    lines: lines.map((l) => {
      const p = book.products.get(l.productId)!;
      return { productId: p.id, name: p.name, baseUnit: p.baseUnit, presentation: countFactor(book, p).name, delta: show(book, p.id, dbToSignedMicro(l.deltaBase)), balance: show(book, p.id, dbToSignedMicro(l.balanceAfter)) };
    }),
  };
}

export const MOVEMENTS_PAGE = 50;

export interface MovementQuery {
  kind?: string | null;
  warehouseId?: string | null;
  from?: Date | null;
  to?: Date | null;
  before?: MovementCursor | null;
}

const KINDS: MovementKind[] = ["entry", "exit", "adjustment", "transfer_out", "transfer_in", "count", "reversal"];

/** RF-62: movimientos de los almacenes visibles, del más reciente al más antiguo, de 50 en 50. */
export async function listMovements(ctx: Ctx, scope: CatalogScope, q: MovementQuery): Promise<{ movements: MovementSummaryView[]; next: string | null }> {
  const access = await inventoryAccess(ctx.store, scope);
  if (q.kind && !KINDS.includes(q.kind as MovementKind)) throw new AppError("validation");
  const warehouseIds = q.warehouseId ? [visibleWarehouse(access, q.warehouseId).id] : access.visible.map((w) => w.id);
  const rows = await ctx.store.inventory.movements.list({ warehouseIds, kind: (q.kind as MovementKind) || undefined, from: q.from ?? undefined, to: q.to ?? undefined, before: q.before ?? undefined, limit: MOVEMENTS_PAGE + 1 });
  const page = rows.slice(0, MOVEMENTS_PAGE);
  const last = page.at(-1);
  return {
    movements: page.map((m) => ({ id: m.id, kind: m.kind, warehouseName: m.warehouseName, reason: m.reason, createdAt: m.createdAt.toISOString(), author: m.authorName, lines: m.lineCount, cancelled: m.reversedBy !== null })),
    next: rows.length > MOVEMENTS_PAGE && last ? `${last.createdAt.toISOString()}_${last.id}` : null,
  };
}

/** Cursor «fecha_id» de la página siguiente. */
export function parseCursor(raw: string | null | undefined): MovementCursor | null {
  if (!raw) return null;
  const [at, id] = raw.split("_");
  const createdAt = new Date(at);
  if (!id || Number.isNaN(createdAt.getTime())) throw new AppError("validation");
  return { createdAt, id };
}

export const HISTORY_PAGE = 50;

/** RF-61: historial de un producto en un almacén, del más reciente al más antiguo. */
export async function productHistory(ctx: Ctx, scope: CatalogScope, warehouseId: string, productId: string, before: number | null): Promise<{ product: { id: string; name: string; presentation: string | null; baseUnit: string }; warehouse: { id: string; name: string }; entries: HistoryEntryView[]; next: number | null }> {
  const access = await inventoryAccess(ctx.store, scope);
  const wh = visibleWarehouse(access, warehouseId);
  const book = await loadBook(ctx.store, access.businessId);
  const product = book.products.get(productId);
  if (!product) throw new AppError("not_found");
  const rows = await ctx.store.inventory.movements.history(wh.id, product.id, before, HISTORY_PAGE + 1);
  const page = rows.slice(0, HISTORY_PAGE);
  const reversed = new Set<string>();
  await Promise.all(page.map(async (r) => (await ctx.store.inventory.movements.reversalOf(r.movementId)) && reversed.add(r.movementId)));
  return {
    product: { id: product.id, name: product.name, presentation: countFactor(book, product).name, baseUnit: product.baseUnit },
    warehouse: { id: wh.id, name: wh.name },
    entries: page.map((r) => ({
      lineId: r.id,
      movementId: r.movementId,
      kind: r.movement.kind,
      createdAt: r.movement.createdAt.toISOString(),
      author: r.authorName,
      delta: show(book, product.id, dbToSignedMicro(r.deltaBase)),
      balance: show(book, product.id, dbToSignedMicro(r.balanceAfter)),
      cancelled: reversed.has(r.movementId),
    })),
    next: rows.length > HISTORY_PAGE ? page.at(-1)!.id : null,
  };
}
