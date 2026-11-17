// Logo de cada negocio (spec 014, RF-25 a RF-27, RF-33 y RF-34): solo el dueño lo sube, cambia o quita; lo ve quien
// tiene acceso al negocio. El archivo vive en el almacén de archivos; al cambiarlo, el anterior se conserva y deja de
// servirse (nada se borra).
import type { Business } from "@/db/schema";
import { isOwner } from "@/domain/access/owner";
import { LOGO_MAX_BYTES, logoBox, pngSize } from "@/domain/business-logo";
import type { WorkbookLogo } from "../adapters/xlsx-writer";
import { AppError } from "../errors";
import { recordAudit } from "./audit";
import type { Ctx } from "./context";
import { uuidOrNotFound } from "./inventory/shared";
import type { PublicUser } from "./users-public";

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
const uuidFrom = (b: Uint8Array) => {
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

/** Versión del logo para la URL (cambia al cambiar el logo, así el navegador no muestra el anterior). */
export const logoVersion = (b: Pick<Business, "logoKey" | "logoUpdatedAt">): string | null => (b.logoKey && b.logoUpdatedAt ? String(b.logoUpdatedAt.getTime()) : null);

/** RF-25 a RF-27 y RF-34: sube o cambia el logo (PNG de hasta 2 MB). */
export async function setBusinessLogo(ctx: Ctx, actor: PublicUser, businessId: string, bytes: Uint8Array): Promise<Business> {
  if (!isOwner(actor)) throw new AppError("forbidden");
  const size = bytes.byteLength <= LOGO_MAX_BYTES ? pngSize(bytes) : null;
  if (!size) throw new AppError("logo_invalid");
  const now = ctx.ports.clock.now();
  const id = uuidOrNotFound(businessId);
  const before = await ctx.store.businesses.findById(id);
  if (!before) throw new AppError("not_found");
  const key = `${before.id}/${uuidFrom(ctx.ports.random.bytes(16))}`;
  await ctx.ports.files.put(key, bytes);
  return ctx.store.transaction(async (repos) => {
    const after = await repos.businesses.update(before.id, { logoKey: key, logoWidth: size.width, logoHeight: size.height, logoUpdatedAt: now, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: before.logoKey ? "business.logo_changed" : "business.logo_set", entityType: "business", entityId: before.id, businessId: before.id, before: { logoKey: before.logoKey }, after: { logoKey: key, width: size.width, height: size.height } });
    return after;
  });
}

/** RF-27 y RF-34: quita el logo; el negocio vuelve a verse con su inicial y su color. */
export async function removeBusinessLogo(ctx: Ctx, actor: PublicUser, businessId: string): Promise<Business> {
  if (!isOwner(actor)) throw new AppError("forbidden");
  const now = ctx.ports.clock.now();
  return ctx.store.transaction(async (repos) => {
    const before = await repos.businesses.findById(uuidOrNotFound(businessId));
    if (!before) throw new AppError("not_found");
    if (!before.logoKey) return before;
    const after = await repos.businesses.update(before.id, { logoKey: null, logoWidth: null, logoHeight: null, logoUpdatedAt: now, updatedAt: now });
    await recordAudit(repos.audit, now, { actorId: actor.id, action: "business.logo_removed", entityType: "business", entityId: before.id, businessId: before.id, before: { logoKey: before.logoKey }, after: { logoKey: null } });
    return after;
  });
}

/** RF-33: el logo solo a quien tiene acceso al negocio; para los demás, no existe. */
export async function readBusinessLogo(ctx: Ctx, actor: PublicUser, businessId: string): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  const business = await ctx.store.businesses.findById(uuidOrNotFound(businessId));
  if (!business) throw new AppError("not_found");
  if (!isOwner(actor)) {
    const [memberships, branches] = await Promise.all([ctx.store.memberships.listByUser(actor.id), ctx.store.branches.listByBusiness(business.id)]);
    if (!memberships.some((m) => branches.some((b) => b.id === m.branchId))) throw new AppError("not_found");
  }
  if (!business.logoKey) return null;
  const bytes = await ctx.ports.files.get(business.logoKey);
  return bytes ? { bytes, width: business.logoWidth ?? 0, height: business.logoHeight ?? 0 } : null;
}

/** RF-31 y RF-32: el logo listo para un documento de un solo negocio (48 px de alto, hasta 200 de ancho), o nulo. */
export async function documentLogo(ctx: Ctx, businessId: string): Promise<WorkbookLogo | null> {
  const business = await ctx.store.businesses.findById(businessId);
  if (!business?.logoKey || !business.logoWidth || !business.logoHeight) return null;
  const png = await ctx.ports.files.get(business.logoKey);
  if (!png) return null;
  return { png, ...logoBox({ width: business.logoWidth, height: business.logoHeight }, 48, 200) };
}
