// Requisiciones (spec 007): armar, solicitar, aprobar, comprar por proveedor y recibir en el almacén de destino como
// entrada de inventario (spec 005). Cada paso en una transacción y en el historial de la requisición.
import type { Product, Requisition, RequisitionGroup, RequisitionLine } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { dbToMicro, dbToMilli, formatMilli, fromBaseMicro, microToDb } from "@/domain/catalog/units";
import { canMoveInWarehouse } from "@/domain/inventory/access";
import { NOTE_MAX, writtenReason } from "@/domain/inventory/movement";
import { dbToSignedMicro, lineToBase, parseCountQuantity, parseLineQuantity } from "@/domain/inventory/quantities";
import { centsToText, groupTotal, parseMoney } from "@/domain/requisitions/money";
import { allDone, canCancel, canDecide, canEdit, canOperate, excessOf, groupStatus, lineDone, pendingOf, type LineState, type RequisitionStatus } from "@/domain/requisitions/state";
import { fromCalculation, mergeLines, roundUp, shortfall } from "@/domain/requisitions/suggest";
import { dbToCentiMicro } from "@/domain/recipes/supplies";
import { AppError } from "../../errors";
import type { Repos } from "../../ports";
import { businessLock, type CatalogScope } from "../catalog/shared";
import type { Ctx } from "../context";
import { applyMovement } from "../inventory/movements";
import { productOption, warehouseOption } from "../inventory/stock";
import { activeProduct, inventoryAccess, loadBook, movableWarehouse, optionalText, presentationFactor, uuidOrNotFound, visibleWarehouse, type Book, type InventoryAccess } from "../inventory/shared";
import type { DraftLine, EventItem, GroupView, LineView, RequisitionSummaryView, RequisitionView } from "./views";

const STATE_TEXT: Record<RequisitionStatus, string> = { requested: "solicitada", approved: "aprobada", rejected: "rechazada", cancelled: "cancelada", closed: "cerrada" };
const stateError = (s: RequisitionStatus) => new AppError("requisition_state", { state: STATE_TEXT[s] });
const BUYER_MAX = 60;

// ---------- Renglones ----------

export interface LineInput {
  productId: string;
  presentationId?: string | null;
  quantity: string;
  supplierId?: string | null;
}

interface ParsedLine {
  productId: string;
  presentationId: string | null;
  supplierId: string | null;
  quantityMicro: bigint;
}

async function activeSuppliers(repos: Repos, businessId: string): Promise<Set<string>> {
  return new Set((await repos.catalog.suppliers.listByBusiness(businessId)).filter((s) => !s.archivedAt).map((s) => s.id));
}

/** RF-7 a RF-11: productos activos, cantidad válida, proveedor activo del negocio o ninguno; repetidos sumados. */
async function parseLines(repos: Repos, book: Book, businessId: string, raw: unknown): Promise<ParsedLine[]> {
  if (!Array.isArray(raw)) throw new AppError("validation");
  if (raw.length > 1000) throw new AppError("validation");
  const suppliers = await activeSuppliers(repos, businessId);
  const lines = raw.map((l) => {
    const { productId, presentationId, quantity, supplierId } = (l ?? {}) as Record<string, unknown>;
    if (typeof quantity !== "string") throw new AppError("validation");
    const product = activeProduct(book, productId);
    const qty = parseLineQuantity(quantity);
    if (qty === null) throw new AppError("invalid_line_quantity");
    const factor = presentationFactor(book, product, presentationId);
    let supplier: string | null = null;
    if (supplierId !== undefined && supplierId !== null && supplierId !== "") {
      if (typeof supplierId !== "string" || !suppliers.has(supplierId)) throw new AppError("not_found");
      supplier = supplierId;
    }
    return { productId: product.id, presentationId: typeof presentationId === "string" && presentationId ? presentationId : null, supplierId: supplier, quantityMicro: lineToBase(qty, factor) };
  });
  const merged = mergeLines(lines);
  if (merged.length === 0) throw new AppError("requisition_empty");
  return merged;
}

const toRows = (lines: ParsedLine[], requested: Map<string, string> = new Map()) =>
  lines.map((l) => ({ productId: l.productId, presentationId: l.presentationId, supplierId: l.supplierId, quantityBase: microToDb(l.quantityMicro), requestedBase: requested.get(l.productId) ?? microToDb(l.quantityMicro) }));

const event = (repos: Repos, requisitionId: string, kind: string, actorId: string, at: Date, detail: Record<string, unknown> | null = null) => repos.requisitions.events.insert({ requisitionId, kind, actorId, at, detail });

/** Una requisición de la sucursal activa; de otra, no existe (RF-6). */
async function ownRequisition(repos: Repos, scope: CatalogScope, id: string, lock = false): Promise<Requisition> {
  const r = lock ? await repos.requisitions.requisitions.lockById(uuidOrNotFound(id)) : await repos.requisitions.requisitions.findById(uuidOrNotFound(id));
  if (!r || r.branchId !== scope.active.branch.id || r.businessId !== scope.active.business.id) throw new AppError("not_found");
  return r;
}

/** RF-4: crear, editar, comprar y recibir pide poder mover en el almacén de destino; el dueño siempre puede. */
function canWork(scope: CatalogScope, access: InventoryAccess, r: Requisition): boolean {
  const wh = access.visible.find((w) => w.id === r.warehouseId);
  return !!wh && canMoveInWarehouse(scope.actor, access.memberships, access.branches, wh);
}

// ---------- Alta, edición y sugerencias ----------

export async function createRequisition(ctx: Ctx, scope: CatalogScope, input: { warehouseId: unknown; lines: unknown; note?: unknown }): Promise<Requisition> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(
    async (repos) => {
      const access = await inventoryAccess(repos, scope);
      const wh = movableWarehouse(scope, access, input.warehouseId);
      const book = await loadBook(repos, access.businessId);
      const lines = await parseLines(repos, book, access.businessId, input.lines);
      const note = optionalText(input.note, NOTE_MAX);
      const owner = isOwner(scope.actor);
      const folio = await repos.requisitions.requisitions.nextFolio(access.businessId);
      // RF-22 y RF-23: lo del dueño nace aprobado.
      const r = await repos.requisitions.requisitions.insert({ businessId: access.businessId, branchId: scope.active.branch.id, warehouseId: wh.id, folio, status: owner ? "approved" : "requested", note, createdBy: scope.actor.id, createdAt: now });
      await repos.requisitions.lines.replace(r.id, toRows(lines));
      await event(repos, r.id, "requested", scope.actor.id, now, { lines: lines.length });
      if (owner) {
        await repos.requisitions.groups.insert(r.id, [...new Set(lines.map((l) => l.supplierId))]);
        await event(repos, r.id, "approved", scope.actor.id, now, { direct: true });
      }
      return r;
    },
    { lock: businessLock(scope.active.business.id) },
  );
}

/** RF-24: mientras está solicitada, la editan quien la creó y el dueño. */
export async function updateRequisition(ctx: Ctx, scope: CatalogScope, id: string, input: { lines: unknown; note?: unknown }): Promise<Requisition> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const r = await ownRequisition(repos, scope, id, true);
    if (!canEdit(r.status)) throw stateError(r.status);
    if (!isOwner(scope.actor) && (r.createdBy !== scope.actor.id || !canWork(scope, access, r))) throw new AppError("forbidden");
    const book = await loadBook(repos, access.businessId);
    const lines = await parseLines(repos, book, access.businessId, input.lines);
    await repos.requisitions.lines.replace(r.id, toRows(lines));
    const after = await repos.requisitions.requisitions.update(r.id, { note: optionalText(input.note, NOTE_MAX), updatedAt: now });
    await event(repos, r.id, "edited", scope.actor.id, now, { lines: lines.length });
    return after;
  });
}

const qtyText = (book: Book, product: Product, presentationId: string | null, micro: bigint) => {
  const factor = presentationId ? dbToMilli(book.presentations.get(presentationId)?.factor ?? "1") : 1000n;
  return formatMilli(fromBaseMicro(micro < 0n ? 0n : micro, factor));
};

function draft(book: Book, product: Product, micro: bigint, presentationId: string | null, supplierId: string | null, suppliers: Set<string>): DraftLine {
  return { productId: product.id, name: product.name, baseUnit: product.baseUnit, presentationId, quantity: qtyText(book, product, presentationId, micro), supplierId: supplierId && suppliers.has(supplierId) ? supplierId : null };
}

/** RF-14 a RF-19: renglones sugeridos desde los mínimos, un cálculo guardado o una plantilla de compra. */
export async function suggestLines(ctx: Ctx, scope: CatalogScope, input: { warehouseId: unknown; source: unknown; id?: unknown }): Promise<{ lines: DraftLine[]; skipped: string[] }> {
  const access = await inventoryAccess(ctx.store, scope);
  const wh = movableWarehouse(scope, access, input.warehouseId);
  const book = await loadBook(ctx.store, access.businessId);
  const suppliers = await activeSuppliers(ctx.store, access.businessId);
  const active = (id: string) => {
    const p = book.products.get(id);
    return p && !p.archivedAt ? p : null;
  };
  const purchaseFactor = (p: Product) => (p.purchasePresentationId ? dbToMilli(book.presentations.get(p.purchasePresentationId)!.factor) : null);
  const lines: DraftLine[] = [];
  const skipped: string[] = [];
  if (input.source === "minimums") {
    const [levels, stock] = await Promise.all([ctx.store.catalog.levels.listByBusiness(access.businessId), ctx.store.inventory.stock.listByWarehouses([wh.id])]);
    for (const l of levels.filter((x) => x.warehouseId === wh.id && x.minBase)) {
      const p = active(l.productId);
      if (!p) continue;
      const have = dbToSignedMicro(stock.find((s) => s.productId === p.id)?.quantityBase ?? "0");
      const missing = shortfall(have, dbToMicro(l.minBase!), l.maxBase ? dbToMicro(l.maxBase) : null);
      if (missing === null) continue;
      lines.push(draft(book, p, roundUp(missing, purchaseFactor(p)), p.purchasePresentationId, p.supplierId, suppliers));
    }
    lines.sort((a, b) => a.name.localeCompare(b.name, "es"));
  } else if (input.source === "calculation") {
    const calc = await ctx.store.recipes.calculations.findById(uuidOrNotFound(input.id));
    if (!calc || calc.branchId !== scope.active.branch.id) throw new AppError("not_found");
    for (const l of await ctx.store.recipes.calculations.lines(calc.id)) {
      const p = active(l.productId);
      if (!p) {
        skipped.push(l.productName);
        continue;
      }
      const micro = fromCalculation(dbToCentiMicro(l.totalBase), l.purchaseFactor && l.purchaseCount !== null ? { factorMilli: dbToMilli(l.purchaseFactor), count: l.purchaseCount } : null);
      lines.push(draft(book, p, micro, p.purchasePresentationId, p.supplierId, suppliers));
    }
  } else if (input.source === "template") {
    const t = await ctx.store.requisitions.templates.findById(uuidOrNotFound(input.id));
    if (!t || t.branchId !== scope.active.branch.id) throw new AppError("not_found");
    for (const item of await ctx.store.requisitions.templates.items(t.id)) {
      const p = book.products.get(item.productId)!;
      if (p.archivedAt) {
        skipped.push(p.name);
        continue;
      }
      lines.push(draft(book, p, dbToMicro(item.quantityBase), item.presentationId, item.supplierId ?? p.supplierId, suppliers));
    }
  } else throw new AppError("validation");
  return { lines, skipped };
}

// ---------- Aprobación, rechazo y cancelación ----------

/** RF-25: el dueño aprueba, con los cambios que haga antes; los grupos por proveedor se fijan aquí. */
export async function approveRequisition(ctx: Ctx, scope: CatalogScope, id: string, input: { lines?: unknown; note?: unknown } = {}): Promise<Requisition> {
  if (!isOwner(scope.actor)) throw new AppError("forbidden");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const r = await ownRequisition(repos, scope, id, true);
    if (!canDecide(r.status)) throw stateError(r.status);
    let current = await repos.requisitions.lines.listByRequisitions([r.id]);
    const changes: { productId: string; from: string | null; to: string | null }[] = [];
    if (input.lines !== undefined) {
      const book = await loadBook(repos, access.businessId);
      const lines = await parseLines(repos, book, access.businessId, input.lines);
      const requested = new Map(current.map((l) => [l.productId, l.requestedBase]));
      for (const l of lines) {
        const before = current.find((c) => c.productId === l.productId)?.quantityBase ?? null;
        if (before === null || dbToMicro(before) !== l.quantityMicro) changes.push({ productId: l.productId, from: before, to: microToDb(l.quantityMicro) });
      }
      for (const c of current) if (!lines.some((l) => l.productId === c.productId)) changes.push({ productId: c.productId, from: c.quantityBase, to: null });
      // Lo que agrega el dueño no se había solicitado.
      current = await repos.requisitions.lines.replace(r.id, toRows(lines, new Map([...requested, ...lines.filter((l) => !requested.has(l.productId)).map((l) => [l.productId, "0"] as [string, string])])));
    }
    await repos.requisitions.groups.insert(r.id, [...new Set(current.map((l) => l.supplierId))]);
    const after = await repos.requisitions.requisitions.update(r.id, { status: "approved", ...(input.note !== undefined ? { note: optionalText(input.note, NOTE_MAX) } : {}), updatedAt: now });
    await event(repos, r.id, "approved", scope.actor.id, now, changes.length ? { changes } : null);
    return after;
  });
}

/** RF-26: el dueño rechaza una solicitada con motivo. */
export async function rejectRequisition(ctx: Ctx, scope: CatalogScope, id: string, rawReason: unknown): Promise<Requisition> {
  if (!isOwner(scope.actor)) throw new AppError("forbidden");
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : null);
  if (!reason) throw new AppError("reason_required");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const r = await ownRequisition(repos, scope, id, true);
    if (!canDecide(r.status)) throw stateError(r.status);
    const after = await repos.requisitions.requisitions.update(r.id, { status: "rejected", updatedAt: now });
    await event(repos, r.id, "rejected", scope.actor.id, now, { reason });
    return after;
  });
}

/** RF-28: se cancela solicitada o aprobada mientras no se haya recibido nada. */
export async function cancelRequisition(ctx: Ctx, scope: CatalogScope, id: string, rawReason: unknown): Promise<Requisition> {
  const reason = writtenReason(typeof rawReason === "string" ? rawReason : null);
  if (!reason) throw new AppError("reason_required");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const access = await inventoryAccess(repos, scope);
    const r = await ownRequisition(repos, scope, id, true);
    if (!isOwner(scope.actor) && !canWork(scope, access, r)) throw new AppError("forbidden");
    const lines = await repos.requisitions.lines.listByRequisitions([r.id]);
    if (!canCancel(r.status, lines.some((l) => dbToMicro(l.receivedBase) > 0n))) throw stateError(r.status);
    const after = await repos.requisitions.requisitions.update(r.id, { status: "cancelled", updatedAt: now });
    await event(repos, r.id, "cancelled", scope.actor.id, now, { reason });
    return after;
  });
}

// ---------- Compra por proveedor ----------

const state = (l: RequisitionLine): LineState => ({ quantityMicro: dbToMicro(l.quantityBase), receivedMicro: dbToMicro(l.receivedBase), closed: l.closedAt !== null });
const inGroup = (g: RequisitionGroup) => (l: RequisitionLine) => l.supplierId === g.supplierId;

async function operable(repos: Repos, scope: CatalogScope, id: string) {
  const access = await inventoryAccess(repos, scope);
  const r = await ownRequisition(repos, scope, id, true);
  if (!canWork(scope, access, r)) throw new AppError("not_found");
  if (!canOperate(r.status)) throw stateError(r.status);
  const [lines, groups] = await Promise.all([repos.requisitions.lines.listByRequisitions([r.id]), repos.requisitions.groups.listByRequisitions([r.id])]);
  return { access, r, lines, groups };
}

export interface GroupInput {
  buyer?: unknown;
  purchased?: unknown;
  total?: unknown;
  amounts?: unknown;
}

/** RF-27 y RF-29 a RF-32: comprador, comprado e importes opcionales, corregibles mientras no se reciba nada. */
export async function updateGroup(ctx: Ctx, scope: CatalogScope, id: string, groupId: string, input: GroupInput): Promise<void> {
  const now = ctx.ports.clock.now();
  await ctx.store.transaction(async (repos) => {
    const { r, lines, groups } = await operable(repos, scope, id);
    const g = groups.find((x) => x.id === groupId);
    if (!g) throw new AppError("not_found");
    const mine = lines.filter(inGroup(g));
    if (mine.some((l) => dbToMicro(l.receivedBase) > 0n || l.closedAt)) throw new AppError("requisition_state", { state: "recibida en parte" });
    const patch: Parameters<Repos["requisitions"]["groups"]["update"]>[1] = {};
    const detail: Record<string, unknown> = { supplierId: g.supplierId };
    if (input.buyer !== undefined) {
      const buyer = typeof input.buyer === "string" ? input.buyer.trim().replace(/\s+/g, " ") : input.buyer === null ? "" : null;
      if (buyer === null) throw new AppError("validation");
      if (buyer.length > BUYER_MAX) throw new AppError("buyer_too_long");
      patch.buyer = buyer || null;
      detail.buyer = patch.buyer;
    }
    if (input.amounts !== undefined) {
      if (!Array.isArray(input.amounts)) throw new AppError("validation");
      for (const a of input.amounts as { lineId?: unknown; amount?: unknown }[]) {
        const line = mine.find((l) => l.id === a?.lineId);
        if (!line) throw new AppError("not_found");
        const cents = parseMoney(typeof a.amount === "string" ? a.amount : a.amount === null ? null : String(a.amount ?? ""));
        if (cents === undefined) throw new AppError("invalid_amount");
        await repos.requisitions.lines.update(line.id, { amountCents: cents });
      }
    }
    if (input.total !== undefined) {
      const cents = parseMoney(typeof input.total === "string" ? input.total : input.total === null ? null : String(input.total));
      if (cents === undefined) throw new AppError("invalid_amount");
      patch.totalCents = cents;
    }
    if (input.purchased === true && !g.purchasedAt) {
      patch.purchasedAt = now;
      patch.purchasedBy = scope.actor.id;
    }
    if (Object.keys(patch).length) await repos.requisitions.groups.update(g.id, patch);
    const kind = input.purchased === true && !g.purchasedAt ? "purchased" : input.amounts !== undefined || input.total !== undefined ? "purchase_edited" : "buyer";
    await event(repos, r.id, kind, scope.actor.id, now, detail);
  });
}

// ---------- Recepción y cierre ----------

export interface ReceiveInput {
  groupId: unknown;
  lines: unknown;
}

/** RF-34 a RF-41: lo que llegó entra al almacén como entrada con el folio; lo pendiente queda pendiente. */
export async function receiveRequisition(ctx: Ctx, scope: CatalogScope, id: string, input: ReceiveInput): Promise<Requisition> {
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const { access, r, lines, groups } = await operable(repos, scope, id);
    const g = groups.find((x) => x.id === input.groupId);
    if (!g) throw new AppError("not_found");
    if (!g.purchasedAt) throw new AppError("not_purchased");
    const wh = movableWarehouse(scope, access, r.warehouseId);
    const book = await loadBook(repos, access.businessId);
    if (!Array.isArray(input.lines)) throw new AppError("validation");
    const received: { line: RequisitionLine; micro: bigint }[] = [];
    const seen = new Set<string>();
    for (const raw of input.lines as Record<string, unknown>[]) {
      const line = lines.find((l) => l.id === raw?.lineId && l.supplierId === g.supplierId);
      if (!line || seen.has(line.id) || typeof raw.quantity !== "string") throw new AppError(line ? "validation" : "not_found");
      seen.add(line.id);
      if (line.closedAt) throw new AppError("requisition_state", { state: "cerrada en ese renglón" });
      const product = activeProduct(book, line.productId);
      const qty = parseCountQuantity(raw.quantity);
      if (qty === null) throw new AppError("invalid_line_quantity");
      const micro = lineToBase(qty, presentationFactor(book, product, raw.presentationId));
      if (micro > 0n) received.push({ line, micro });
    }
    if (received.length) {
      for (const x of received) await repos.requisitions.lines.update(x.line.id, { receivedBase: microToDb(dbToMicro(x.line.receivedBase) + x.micro) });
      await applyMovement(
        repos,
        wh,
        { kind: "entry", supplierId: g.supplierId, reference: `REQ-${r.folio}`, requisitionId: r.id, createdBy: scope.actor.id, createdAt: now },
        received.map((x) => ({ productId: x.line.productId, deltaMicro: x.micro })),
      );
      await event(repos, r.id, "received", scope.actor.id, now, { supplierId: g.supplierId, lines: received.map((x) => ({ productId: x.line.productId, quantity: microToDb(x.micro) })) });
    }
    return closeIfDone(repos, r, scope.actor.id, now);
  });
}

async function closeIfDone(repos: Repos, r: Requisition, actorId: string, now: Date): Promise<Requisition> {
  const lines = await repos.requisitions.lines.listByRequisitions([r.id]);
  if (!allDone(lines.map(state))) return r;
  const after = await repos.requisitions.requisitions.update(r.id, { status: "closed", updatedAt: now });
  await event(repos, r.id, "closed", actorId, now);
  return after;
}

/** RF-39: se cierra lo que falta de unos renglones con motivo, sin recibirlo. */
export async function closeLines(ctx: Ctx, scope: CatalogScope, id: string, input: { lineIds: unknown; reason: unknown }): Promise<Requisition> {
  const reason = writtenReason(typeof input.reason === "string" ? input.reason : null);
  if (!reason) throw new AppError("reason_required");
  if (!Array.isArray(input.lineIds) || input.lineIds.length === 0) throw new AppError("validation");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const { r, lines } = await operable(repos, scope, id);
    const closed: string[] = [];
    for (const lineId of input.lineIds as unknown[]) {
      const line = lines.find((l) => l.id === lineId);
      if (!line) throw new AppError("not_found");
      if (lineDone(state(line))) continue;
      await repos.requisitions.lines.update(line.id, { closedAt: now, closedBy: scope.actor.id, closeReason: reason });
      closed.push(line.productId);
    }
    if (closed.length) await event(repos, r.id, "lines_closed", scope.actor.id, now, { products: closed, reason });
    return closeIfDone(repos, r, scope.actor.id, now);
  });
}

// ---------- Consulta ----------

function groupsOf(r: Requisition, lines: RequisitionLine[], groups: RequisitionGroup[]): { g: RequisitionGroup | null; supplierId: string | null; lines: RequisitionLine[] }[] {
  if (groups.length) return groups.map((g) => ({ g, supplierId: g.supplierId, lines: lines.filter(inGroup(g)) }));
  const ids = [...new Set(lines.map((l) => l.supplierId))];
  return ids.map((supplierId) => ({ g: null, supplierId, lines: lines.filter((l) => l.supplierId === supplierId) }));
}

const totalOf = (g: RequisitionGroup | null, lines: RequisitionLine[]) => groupTotal(g?.totalCents ?? null, lines.map((l) => l.amountCents));

export async function requisitionDetail(ctx: Ctx, scope: CatalogScope, id: string): Promise<RequisitionView> {
  const access = await inventoryAccess(ctx.store, scope);
  const r = await ownRequisition(ctx.store, scope, id);
  const [book, lines, groups, events, users, suppliers] = await Promise.all([
    loadBook(ctx.store, access.businessId),
    ctx.store.requisitions.lines.listByRequisitions([r.id]),
    ctx.store.requisitions.groups.listByRequisitions([r.id]),
    ctx.store.requisitions.events.listByRequisition(r.id),
    ctx.store.users.list(),
    ctx.store.catalog.suppliers.listByBusiness(access.businessId),
  ]);
  const wh = visibleWarehouse(access, r.warehouseId);
  const nameOf = (uid: string | null) => (uid ? (users.find((u) => u.id === uid)?.name ?? "") : null);
  const owner = isOwner(scope.actor);
  const work = canWork(scope, access, r);
  const anyReceived = lines.some((l) => dbToMicro(l.receivedBase) > 0n);
  const lineViews: LineView[] = lines.map((l) => {
    const p = book.products.get(l.productId)!;
    const pres = l.presentationId ? book.presentations.get(l.presentationId) : undefined;
    const show = (micro: bigint) => qtyText(book, p, pres ? l.presentationId : null, micro);
    const st = state(l);
    return {
      id: l.id,
      productId: p.id,
      name: p.name,
      baseUnit: p.baseUnit,
      presentation: pres ? { id: pres.id, name: pres.name, factor: formatMilli(dbToMilli(pres.factor)) } : { id: null, name: null, factor: "1" },
      requested: show(dbToMicro(l.requestedBase)),
      quantity: show(st.quantityMicro),
      received: show(st.receivedMicro),
      pending: show(pendingOf(st)),
      excess: show(excessOf(st)),
      supplierId: l.supplierId,
      amount: l.amountCents === null ? null : centsToText(l.amountCents),
      closed: l.closedAt ? { at: l.closedAt.toISOString(), by: nameOf(l.closedBy) ?? "", reason: l.closeReason } : null,
      archived: p.archivedAt !== null,
    };
  });
  const groupViews: GroupView[] = groupsOf(r, lines, groups).map(({ g, supplierId, lines: gl }) => {
    const s = suppliers.find((x) => x.id === supplierId);
    const total = totalOf(g, gl);
    return {
      id: g?.id ?? null,
      supplierId,
      supplierName: s?.name ?? null,
      supplierArchived: !!s?.archivedAt,
      buyer: g?.buyer ?? null,
      status: groupStatus(!!g?.purchasedAt, gl.map(state)),
      purchasedAt: g?.purchasedAt?.toISOString() ?? null,
      purchasedBy: nameOf(g?.purchasedBy ?? null),
      total: total === null ? null : centsToText(total),
      totalFromLines: gl.some((l) => l.amountCents !== null),
      anyReceived: gl.some((l) => dbToMicro(l.receivedBase) > 0n || l.closedAt !== null),
      lineIds: gl.map((l) => l.id),
    };
  });
  const totals = groupViews.map((g) => g.total).filter((t): t is string => t !== null);
  const eventViews: EventItem[] = events.map((e) => ({ kind: e.kind, at: e.at.toISOString(), actor: e.actorName, detail: (e.detail as Record<string, unknown> | null) ?? null }));
  return {
    id: r.id,
    folio: r.folio,
    status: r.status,
    warehouse: { id: wh.id, name: wh.name, archived: wh.archivedAt !== null },
    note: r.note,
    createdAt: r.createdAt.toISOString(),
    author: nameOf(r.createdBy) ?? "",
    isOwner: owner,
    canEdit: canEdit(r.status) && (owner || (r.createdBy === scope.actor.id && work)),
    canDecide: owner && canDecide(r.status),
    canCancel: (owner || work) && canCancel(r.status, anyReceived),
    canOperate: work && canOperate(r.status),
    total: totals.length ? centsToText(totals.reduce((a, t) => a + BigInt(t.replace(".", "")), 0n)) : null,
    lines: lineViews,
    groups: groupViews,
    events: eventViews,
  };
}

const STATUSES: RequisitionStatus[] = ["requested", "approved", "rejected", "cancelled", "closed"];

/** RF-42 y RF-43: requisiciones de la sucursal activa, de la más reciente a la más antigua. */
export async function listRequisitions(ctx: Ctx, scope: CatalogScope, status?: string | null): Promise<RequisitionSummaryView[]> {
  const access = await inventoryAccess(ctx.store, scope);
  if (status && !STATUSES.includes(status as RequisitionStatus)) throw new AppError("validation");
  const rows = await ctx.store.requisitions.requisitions.listByBranch(scope.active.branch.id, (status as RequisitionStatus) || null, 200);
  const ids = rows.map((r) => r.id);
  const [lines, groups] = await Promise.all([ctx.store.requisitions.lines.listByRequisitions(ids), ctx.store.requisitions.groups.listByRequisitions(ids)]);
  return rows.map((r) => {
    const mine = lines.filter((l) => l.requisitionId === r.id);
    const totals = groupsOf(r, mine, groups.filter((g) => g.requisitionId === r.id))
      .map(({ g, lines: gl }) => totalOf(g, gl))
      .filter((t): t is bigint => t !== null);
    return {
      id: r.id,
      folio: r.folio,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      author: r.authorName,
      warehouseName: access.visible.find((w) => w.id === r.warehouseId)?.name ?? "",
      lines: mine.length,
      pending: r.status === "approved" && mine.some((l) => pendingOf(state(l)) > 0n),
      total: totals.length ? centsToText(totals.reduce((a, b) => a + b, 0n)) : null,
    };
  });
}

/** RF-47: para el inicio, cuántas esperan aprobación (solo al dueño) y cuántas tienen algo por recibir. */
export async function requisitionCounts(ctx: Ctx, scope: CatalogScope): Promise<{ toApprove: number | null; toReceive: number }> {
  await inventoryAccess(ctx.store, scope);
  const counts = await ctx.store.requisitions.requisitions.countByStatus(scope.active.branch.id);
  return { toApprove: isOwner(scope.actor) ? (counts.requested ?? 0) : null, toReceive: counts.approved ?? 0 };
}

/** Lo que necesita la pantalla de armado: almacenes, productos con proveedor y presentación de compra, proveedores,
 * cálculos guardados y plantillas activas de la sucursal. */
export async function builderData(ctx: Ctx, scope: CatalogScope) {
  const access = await inventoryAccess(ctx.store, scope);
  const [book, suppliers, calcs, templates] = await Promise.all([
    loadBook(ctx.store, access.businessId),
    ctx.store.catalog.suppliers.listByBusiness(access.businessId),
    ctx.store.recipes.calculations.listByBranch(scope.active.branch.id),
    ctx.store.requisitions.templates.listByBranch(scope.active.branch.id),
  ]);
  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name, "es");
  return {
    owner: isOwner(scope.actor),
    warehouses: access.visible.filter((w) => !w.archivedAt && canMoveInWarehouse(scope.actor, access.memberships, access.branches, w)).map(warehouseOption).sort(byName),
    products: [...book.products.values()]
      .filter((p) => !p.archivedAt)
      .map((p) => ({ ...productOption(book, p), supplierId: p.supplierId, purchasePresentationId: p.purchasePresentationId }))
      .sort(byName),
    suppliers: suppliers.filter((s) => !s.archivedAt).map((s) => ({ id: s.id, name: s.name })).sort(byName),
    calculations: calcs.slice(0, 30).map((c) => ({ id: c.id, createdAt: c.createdAt.toISOString(), author: c.authorName })),
    templates: templates.filter((x) => !x.archivedAt).map((x) => ({ id: x.id, name: x.name })),
  };
}
