// Escenario del catálogo (spec 003): Pastatti con Sendero y Centro, Pirrus con Centro; un administrador solo de
// Sendero y otro solo de Pirrus. Devuelve los alcances (persona + sucursal activa) listos para los servicios.
import { addBranch, createBusiness } from "@/server/services/businesses";
import type { CatalogScope } from "@/server/services/catalog/shared";
import { createPerson } from "@/server/services/people";
import { createFirstOwner } from "@/server/services/setup";
import { publicUser } from "@/server/services/users-public";
import { makeCtx, OWNER } from "./helpers";

export async function catalogWorld() {
  const ctx = makeCtx();
  const owner = (await createFirstOwner(ctx, OWNER)).user;
  const { business: pastatti, branch: sendero } = await createBusiness(ctx, owner, { name: "Pastatti", firstBranchName: "Sendero", color: "violeta" });
  const centro = await addBranch(ctx, owner, pastatti.id, { name: "Centro" });
  const { business: pirrus, branch: pirrusCentro } = await createBusiness(ctx, owner, { name: "Pirrus", firstBranchName: "Centro", color: "rojo" });
  const adminOf = async (email: string, branchIds: string[]) => {
    const { person } = await createPerson(ctx, owner, { name: `Admin ${email}`, email, role: "admin", branchIds });
    return publicUser((await ctx.store.users.findById(person.id))!);
  };
  const senderoAdmin = await adminOf("sendero@mando.test", [sendero.id]);
  const pirrusAdmin = await adminOf("pirrus@mando.test", [pirrusCentro.id]);
  const at = (actor: typeof owner, branch: typeof sendero, business: typeof pastatti): CatalogScope => ({ actor, active: { branch, business } });
  return {
    ctx,
    owner,
    senderoAdmin,
    pirrusAdmin,
    pastatti,
    pirrus,
    sendero,
    centro,
    pirrusCentro,
    ownerSendero: at(owner, sendero, pastatti),
    ownerCentro: at(owner, centro, pastatti),
    ownerPirrus: at(owner, pirrusCentro, pirrus),
    adminSendero: at(senderoAdmin, sendero, pastatti),
    adminPirrus: at(pirrusAdmin, pirrusCentro, pirrus),
  };
}
