// Spec 001, RF-32 a RF-38: sucursal activa.
import { describe, expect, it } from "vitest";
import { PUT as putBranch } from "@/app/api/session/branch/route";
import { GET as me } from "@/app/api/me/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as setupPost } from "@/app/api/setup/route";
import { branchChoices, resolveBranchState, selectBranch } from "@/server/services/active-branch";
import { authenticate, login as loginService } from "@/server/services/auth";
import { archiveBranch, createBusiness } from "@/server/services/businesses";
import { createPerson, updatePerson } from "@/server/services/people";
import { createFirstOwner } from "@/server/services/setup";
import { ApiClient, json } from "./api";
import { makeCtx, OWNER } from "./helpers";

async function world() {
  const ctx = makeCtx();
  const owner = await createFirstOwner(ctx, OWNER);
  const pastatti = await createBusiness(ctx, owner.user, { name: "Pastatti", firstBranchName: "Sendero" });
  const pirrus = await createBusiness(ctx, owner.user, { name: "Pirrus", firstBranchName: "Centro" });
  const { person, temporaryPassword } = await createPerson(ctx, owner.user, { name: "Ana", email: "ana@mando.test", role: "admin", branchIds: [pastatti.branch.id] });
  const ana = await loginService(ctx, { email: "ana@mando.test", password: temporaryPassword });
  const auth = (await authenticate(ctx, ana.token))!;
  return { ctx, owner, sendero: pastatti.branch, centro: pirrus.branch, ana: auth, anaId: person.id };
}

describe("spec 001 — sucursal activa", () => {
  it("test_s001_rf33_con_una_sola_sucursal_se_activa_sola_y_queda_recordada", async () => {
    const { ctx, ana, sendero } = await world();
    const state = await resolveBranchState(ctx, ana);
    expect(state.kind).toBe("active");
    if (state.kind === "active") expect(state.active.branch.id).toBe(sendero.id);
    expect((await ctx.store.sessions.findById(ana.sessionId))?.activeBranchId).toBe(sendero.id);
    expect((await ctx.store.users.findById(ana.user.id))?.lastBranchId).toBe(sendero.id);
  });

  it("test_s001_rf32_rf34_con_varias_hay_que_elegir_y_la_elegida_se_recuerda_entre_entradas", async () => {
    const { ctx, owner, centro } = await world();
    const auth = (await authenticate(ctx, owner.token))!;
    expect((await resolveBranchState(ctx, auth)).kind).toBe("choose");
    expect((await branchChoices(ctx, auth.user)).map((c) => c.business.name)).toEqual(["Pastatti", "Pirrus"]);
    expect((await selectBranch(ctx, auth, centro.id)).branch.id).toBe(centro.id);
    const again = await loginService(ctx, { email: OWNER.email, password: OWNER.password });
    const state = await resolveBranchState(ctx, (await authenticate(ctx, again.token))!);
    expect(state.kind === "active" && state.active.branch.id).toBe(centro.id);
  });

  it("test_s001_rf36_rf38_al_perder_la_activa_se_pide_otra_y_sin_ninguna_no_hay_sucursal", async () => {
    const { ctx, owner, ana, anaId, sendero, centro } = await world();
    await resolveBranchState(ctx, ana);
    await updatePerson(ctx, owner.user, anaId, { branchIds: [centro.id] });
    const after = await resolveBranchState(ctx, (await authenticate(ctx, ana.sessionId ? ana.sessionId && (await ctx.store.sessions.findById(ana.sessionId)) ? "tok-2" : "" : ""))!);
    expect(after.kind === "active" && after.active.branch.id).toBe(centro.id);
    await archiveBranch(ctx, owner.user, centro.id);
    const none = await resolveBranchState(ctx, (await authenticate(ctx, "tok-2"))!);
    expect(none.kind).toBe("none");
    expect(sendero.name).toBe("Sendero");
  });

  it("test_s001_rf37_elegir_una_sucursal_ajena_o_inexistente_responde_igual", async () => {
    const { ctx, ana, centro } = await world();
    await expect(selectBranch(ctx, ana, centro.id)).rejects.toMatchObject({ code: "not_found", status: 404 });
    await expect(selectBranch(ctx, ana, "00000000-0000-4000-8000-000000000000")).rejects.toMatchObject({ code: "not_found", status: 404 });
  });

  it("test_s001_rf32_rf35_la_api_devuelve_opciones_y_cambia_la_activa", async () => {
    const owner = new ApiClient();
    await owner.call(setupPost, "/api/setup", { body: OWNER });
    const { createBusiness: createBusinessApi } = { createBusiness: (await import("@/app/api/businesses/route")).POST };
    const { business: pastatti } = await json(await owner.call(createBusinessApi, "/api/businesses", { body: { name: "Pastatti", firstBranchName: "Sendero" } }));
    await owner.call(createBusinessApi, "/api/businesses", { body: { name: "Pirrus", firstBranchName: "Centro" } });
    const first = await json(await owner.call(me, "/api/me"));
    expect(first.state).toBe("choose");
    expect(first.choices).toHaveLength(2);
    const chosen = await owner.call(putBranch, "/api/session/branch", { method: "PUT", body: { branchId: pastatti.branches[0].id } });
    expect((await json(chosen)).activeBranch).toMatchObject({ name: "Sendero", business: { name: "Pastatti" } });
    expect((await json(await owner.call(me, "/api/me"))).activeBranch.name).toBe("Sendero");
    const again = new ApiClient();
    await again.call(login, "/api/auth/login", { body: { email: OWNER.email, password: OWNER.password } });
    expect((await json(await again.call(me, "/api/me"))).activeBranch.name).toBe("Sendero");
  });
});
