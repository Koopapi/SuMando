// Traspasos (spec 005, RF-22 a RF-38, RF-64). Dentro del negocio: salen y entran en la misma operación. Entre
// negocios: salen al enviar, quedan en camino y entran cuando el negocio que recibe confirma lo que llegó.
import type { Business, InventoryTransfer, InventoryTransferLine, Warehouse } from "@/db/schema";
import { catalogKey } from "@/domain/catalog/names";
import { NOTE_MAX, writtenReason } from "@/domain/inventory/movement";
import { dbToSignedMicro, formatStock, lineToBase, parseCountQuantity, signedMicroToDb } from "@/domain/inventory/quantities";
import { canTransition, proposeProduct, sameWarehouse } from "@/domain/inventory/transfer";
import { canMoveInWarehouse } from "@/domain/inventory/access";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { recordAudit } from "../audit";
import type { CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { applyMovement } from "./movements";
import { uuidOrNotFound, inventoryAccess, loadBook, movableWarehouse, optionalText, parseLines, presentationFactor, type InventoryAccess } from "./shared";
import type { DestinationView, TransferLineView, TransferView } from "./views";

const STATE_TEXT: Record<InventoryTransfer["status"], string> = { done: "hecho", in_transit: "en camino", received: "recibido", cancelled: "cancelado" };
const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");

/** Almacén activo de un negocio activo, con su sucursal activa si la tiene. */
async function activeDestination(repos: Repos, id: unknown): Promise<{ warehouse: Warehouse; business: Business }> {
  const warehouse = await repos.catalog.warehouses.findById(uuidOrNotFound(id));
  if (!warehouse) throw new AppError("not_found");
  const business = (await repos.businesses.findById(warehouse.businessId))!;
  const branch = warehouse.branchId ? await repos.branches.findById(warehouse.branchId) : null;
  if (business.archivedAt || branch?.archivedAt) throw new AppError("not_found");
  if (warehouse.archivedAt) throw new AppError("archived_item", { name: warehouse.name });
  return { warehouse, business };
}

/** RF-25, RF-26 y RF-38: almacenes activos de cualquier negocio activo, solo con su nombre. */
export async function transferDestinations(ctx: Ctx, scope: CatalogScope): Promise<DestinationView[]> {
  const access = await inventoryAccess(ctx.store, scope);
  const [businesses, branches] = await Promise.all([ctx.store.businesses.list(), ctx.store.branches.listAll()]);
  const out: DestinationView[] = [];
  for (const b of businesses.filter((x) => !x.archivedAt)) {
    const all = await ctx.store.catalog.warehouses.listByBusiness(b.id);
    const warehouses = all.filter((w) => !w.archivedAt && (w.branchId === null || branches.some((br) => br.id === w.branchId && !br.archivedAt))).map((w) => ({ id: w.id, name: w.name }));
    if (warehouses.length) out.push({ id: b.id, name: b.name, own: b.id === access.businessId, warehouses: warehouses.sort(byName) });
  }
  return out.sort((a, b) => Number(b.own) - Number(a.own) || a.name.localeCompare(b.name, "es"));
}

export async function sendTransfer(ctx: Ctx, scope: CatalogScope, input: { fromWarehouseId: unknown; toWarehouseId: unknown; lines: unknown; note?: unknown }): Promise<InventoryTransfer> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const from = movableWarehouse(scope, access, input.fromWarehouseId);
    if (typeof input.toWarehouseId === "string" && sameWarehouse(from.id, input.toWarehouseId)) throw new AppError("same_warehouse");
    const { warehouse: to } = await activeDestination(repos, input.toWarehouseId);
    const book = await loadBook(repos, access.businessId);
    const lines = parseLines(book, input.lines);
    const note = optionalText(input.note, NOTE_MAX);
    const cross = to.businessId !== from.businessId;
    const transfer = await repos.inventory.transfers.insert({
      fromBusinessId: from.businessId,
      fromWarehouseId: from.id,
      toBusinessId: to.businessId,
      toWarehouseId: to.id,
      status: cross ? "in_transit" : "done",
      note,
      sentBy: scope.actor.id,
      sentAt: now,
      lines: lines.map((l) => ({ fromProductId: l.product.id, productName: l.product.name, baseUnit: l.product.baseUnit, quantitySent: signedMicroToDb(l.baseMicro) })),
    });
    const meta = { createdBy: scope.actor.id, createdAt: now, transferId: transfer.id, note };
    // RF-24 y RF-27: sale del origen siempre; entra al destino ya solo si es del mismo negocio.
    await applyMovement(repos, from, { ...meta, kind: "transfer_out" }, lines.map((l) => ({ productId: l.product.id, deltaMicro: -l.baseMicro })));
    if (!cross) await applyMovement(repos, to, { ...meta, kind: "transfer_in" }, lines.map((l) => ({ productId: l.product.id, deltaMicro: l.baseMicro })));
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: cross ? "transfer.sent" : "transfer.done", entityType: "transfer", entityId: transfer.id, businessId: from.businessId, branchId: from.branchId, after: { from: from.id, to: to.id, lines: lines.length } });
    return transfer;
  });
}

type Side = { origin: boolean; destination: boolean };

/** Quien mira: el origen o el destino deben ser almacenes visibles para la sucursal activa (RF-5). */
function sideOf(access: InventoryAccess, t: InventoryTransfer): Side {
  const origin = access.visible.some((w) => w.id === t.fromWarehouseId);
  const destination = access.visible.some((w) => w.id === t.toWarehouseId);
  if (!origin && !destination) throw new AppError("not_found");
  return { origin, destination };
}

async function view(repos: Repos, scope: CatalogScope, access: InventoryAccess, t: InventoryTransfer, lines: InventoryTransferLine[]): Promise<TransferView> {
  const side = sideOf(access, t);
  const [fromWh, toWh, fromB, toB, users] = await Promise.all([
    repos.catalog.warehouses.findById(t.fromWarehouseId),
    repos.catalog.warehouses.findById(t.toWarehouseId),
    repos.businesses.findById(t.fromBusinessId),
    repos.businesses.findById(t.toBusinessId),
    repos.users.list(),
  ]);
  const nameOf = (id: string | null) => (id ? (users.find((u) => u.id === id)?.name ?? "") : null);
  const cross = t.fromBusinessId !== t.toBusinessId;
  const can = (wh: Warehouse | null) => !!wh && !wh.archivedAt && canMoveInWarehouse(scope.actor, access.memberships, access.branches, wh);
  const canReceive = cross && side.destination && t.status === "in_transit" && can(toWh);
  const canCancel = side.origin && canTransition(t.status, "cancel", cross) && can(fromWh);
  // RF-31 y RF-33: el producto propuesto solo lo ve quien recibe; quien envía no ve el catálogo del otro (RF-38).
  const proposals = new Map<string, string | null>();
  const toProducts = side.destination ? await repos.catalog.products.listByBusiness(t.toBusinessId) : [];
  if (canReceive) {
    const links = await repos.inventory.links.find(lines.map((l) => l.fromProductId), t.toBusinessId);
    const candidates = toProducts.map((p) => ({ id: p.id, nameKey: p.nameKey, baseUnit: p.baseUnit, archived: p.archivedAt !== null }));
    for (const l of lines) proposals.set(l.id, proposeProduct({ nameKey: catalogKey(l.productName), baseUnit: l.baseUnit }, links.find((x) => x.fromProductId === l.fromProductId)?.toProductId ?? null, candidates));
  }
  const base = (v: string | null) => (v === null ? null : formatStock(dbToSignedMicro(v), 1000n));
  const lineViews: TransferLineView[] = lines.map((l) => {
    const sent = dbToSignedMicro(l.quantitySent);
    const received = l.quantityReceived === null ? null : dbToSignedMicro(l.quantityReceived);
    const toProduct = l.toProductId && side.destination ? toProducts.find((p) => p.id === l.toProductId) : undefined;
    return {
      id: l.id,
      name: l.productName,
      baseUnit: l.baseUnit,
      sent: base(l.quantitySent)!,
      received: base(l.quantityReceived),
      difference: received === null ? null : formatStock(received - sent, 1000n),
      toProduct: toProduct ? { id: toProduct.id, name: toProduct.name } : null,
      proposedProductId: proposals.get(l.id) ?? null,
    };
  });
  return {
    id: t.id,
    crossBusiness: cross,
    status: t.status,
    from: { business: fromB?.name ?? "", warehouse: fromWh?.name ?? "" },
    to: { business: toB?.name ?? "", warehouse: toWh?.name ?? "" },
    note: t.note,
    sentAt: t.sentAt.toISOString(),
    sentBy: nameOf(t.sentBy)!,
    receivedAt: t.receivedAt?.toISOString() ?? null,
    receivedBy: nameOf(t.receivedBy),
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    cancelledBy: nameOf(t.cancelledBy),
    cancelReason: t.cancelReason,
    canReceive,
    canCancel,
    hasDifference: lineViews.some((l) => l.difference !== null && l.difference !== "0"),
    lines: lineViews,
  };
}

export async function transferDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<TransferView> {
  const access = await inventoryAccess(ctx.store, scope);
  const t = await ctx.store.inventory.transfers.findById(uuidOrNotFound(id));
  if (!t) throw new AppError("not_found");
  return view(ctx.store, scope, access, t, await ctx.store.inventory.transfers.lines(t.id));
}

/** RF-28: por recibir (en camino hacia almacenes visibles), enviados en camino y los recientes. */
export async function listTransfers(ctx: Ctx, scope: CatalogScope): Promise<{ incoming: TransferView[]; outgoing: TransferView[]; recent: TransferView[] }> {
  const access = await inventoryAccess(ctx.store, scope);
  const ids = access.visible.map((w) => w.id);
  const all = await ctx.store.inventory.transfers.listForWarehouses(ids, 100);
  const views = await Promise.all(all.map(async (t) => view(ctx.store, scope, access, t, await ctx.store.inventory.transfers.lines(t.id))));
  const pending = (v: TransferView, t: InventoryTransfer) => v.status === "in_transit" && t;
  return {
    incoming: views.filter((v, i) => pending(v, all[i]) && ids.includes(all[i].toWarehouseId)),
    outgoing: views.filter((v, i) => pending(v, all[i]) && ids.includes(all[i].fromWarehouseId) && !ids.includes(all[i].toWarehouseId)),
    recent: views.filter((v) => v.status !== "in_transit").slice(0, 30),
  };
}

/** Cuántos traspasos esperan recepción en los almacenes visibles (para el inicio). */
export async function pendingIncoming(ctx: Ctx, scope: CatalogScope): Promise<number> {
  const access = await inventoryAccess(ctx.store, scope);
  const ids = access.visible.map((w) => w.id);
  const all = await ctx.store.inventory.transfers.listForWarehouses(ids, 100);
  return all.filter((t) => t.status === "in_transit" && ids.includes(t.toWarehouseId)).length;
}

export interface ReceiveLine {
  lineId: string;
  productId?: string | null;
  presentationId?: string | null;
  quantity: string;
}

/** RF-29 a RF-35: recibe con la cantidad que llegó en el producto elegido o propuesto, y recuerda la elección. */
export async function receiveTransfer(ctx: Ctx, scope: CatalogScope, id: string, raw: unknown): Promise<InventoryTransfer> {
  if (!Array.isArray(raw)) throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const t = await repos.inventory.transfers.lockById(uuidOrNotFound(id));
    if (!t || !access.visible.some((w) => w.id === t.toWarehouseId)) throw new AppError("not_found");
    if (!canTransition(t.status, "receive", t.fromBusinessId !== t.toBusinessId)) throw new AppError("transfer_state", { state: STATE_TEXT[t.status] });
    const to = movableWarehouse(scope, access, t.toWarehouseId);
    const book = await loadBook(repos, access.businessId);
    const lines = await repos.inventory.transfers.lines(t.id);
    const input = new Map<string, ReceiveLine>();
    for (const r of raw as ReceiveLine[]) {
      if (!r || typeof r.lineId !== "string" || typeof r.quantity !== "string" || input.has(r.lineId)) throw new AppError("validation");
      input.set(r.lineId, r);
    }
    if (input.size !== lines.length || lines.some((l) => !input.has(l.id))) throw new AppError("validation");
    const received: { line: InventoryTransferLine; productId: string; baseMicro: bigint }[] = [];
    for (const line of lines) {
      const r = input.get(line.id)!;
      // RF-32: hay que elegir producto activo del negocio que recibe, con la misma unidad base.
      if (!r.productId) throw new AppError("product_required", { product: line.productName });
      const product = book.products.get(r.productId);
      if (!product) throw new AppError("not_found");
      if (product.archivedAt) throw new AppError("archived_item", { name: product.name });
      if (product.baseUnit !== line.baseUnit) throw new AppError("unit_mismatch", { product: line.productName });
      const qty = parseCountQuantity(r.quantity);
      if (qty === null) throw new AppError("invalid_line_quantity");
      received.push({ line, productId: product.id, baseMicro: lineToBase(qty, presentationFactor(book, product, r.presentationId)) });
    }
    if (new Set(received.map((r) => r.productId)).size !== received.length) {
      const dup = received.find((r, i) => received.findIndex((x) => x.productId === r.productId) !== i)!;
      throw new AppError("duplicate_line", { product: book.products.get(dup.productId)!.name });
    }
    for (const r of received) {
      await repos.inventory.transfers.receiveLine(r.line.id, r.productId, signedMicroToDb(r.baseMicro));
      await repos.inventory.links.upsert(r.line.fromProductId, access.businessId, r.productId, scope.actor.id, now);
    }
    const moving = received.filter((r) => r.baseMicro > 0n);
    if (moving.length) await applyMovement(repos, to, { kind: "transfer_in", transferId: t.id, createdBy: scope.actor.id, createdAt: now }, moving.map((r) => ({ productId: r.productId, deltaMicro: r.baseMicro })));
    const after = await repos.inventory.transfers.update(t.id, { status: "received", receivedBy: scope.actor.id, receivedAt: now });
    const differences = received.filter((r) => r.baseMicro !== dbToSignedMicro(r.line.quantitySent)).map((r) => ({ product: r.line.productName, sent: r.line.quantitySent, received: signedMicroToDb(r.baseMicro) }));
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "transfer.received", entityType: "transfer", entityId: t.id, businessId: access.businessId, branchId: to.branchId, before: { status: t.status }, after: { status: "received", differences } });
    return after;
  });
}

/** RF-36 y RF-64: cancela uno en camino (devuelve al origen) o uno interno hecho (revierte salida y entrada). */
export async function cancelTransfer(ctx: Ctx, scope: CatalogScope, id: string, rawReason: unknown): Promise<InventoryTransfer> {
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : null);
  if (!reason) throw new AppError("reason_required");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const t = await repos.inventory.transfers.lockById(uuidOrNotFound(id));
    if (!t || !access.visible.some((w) => w.id === t.fromWarehouseId)) throw new AppError("not_found");
    const cross = t.fromBusinessId !== t.toBusinessId;
    if (!canTransition(t.status, "cancel", cross)) throw new AppError("transfer_state", { state: STATE_TEXT[t.status] });
    movableWarehouse(scope, access, t.fromWarehouseId);
    const movements = await repos.inventory.movements.byTransfer(t.id);
    for (const m of movements) {
      const wh = (await repos.catalog.warehouses.findById(m.warehouseId))!;
      const lines = await repos.inventory.movements.lines(m.id);
      await applyMovement(repos, wh, { kind: "reversal", reversesId: m.id, transferId: t.id, note: reason, createdBy: scope.actor.id, createdAt: now }, lines.map((l) => ({ productId: l.productId, deltaMicro: -dbToSignedMicro(l.deltaBase) })));
    }
    const after = await repos.inventory.transfers.update(t.id, { status: "cancelled", cancelledBy: scope.actor.id, cancelledAt: now, cancelReason: reason });
    await recordAudit(repos.audit, now, { actorId: scope.actor.id, action: "transfer.cancelled", entityType: "transfer", entityId: t.id, businessId: access.businessId, before: { status: t.status }, after: { status: "cancelled", reason } });
    return after;
  });
}
