// Spec 014: logo de cada negocio contra la BD de pruebas (subir, cambiar, quitar, servir, permisos y registro).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { readBusinessLogo, removeBusinessLogo, setBusinessLogo } from "@/server/services/business-logo";
import { catalogWorld } from "./catalog-fixture";
import { code } from "./inventory-fixture";

/** Un PNG mínimo con el ancho y alto dados en su encabezado IHDR. */
function png(width: number, height: number, extra = 0): Uint8Array {
  const b = new Uint8Array(33 + extra);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

describe("spec 014 — logo del negocio", () => {
  it("test_s014_rf25_el_dueno_sube_el_logo_y_queda_con_sus_medidas", async () => {
    const w = await catalogWorld();
    const after = await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(400, 200));
    expect(after).toMatchObject({ logoWidth: 400, logoHeight: 200 });
    expect(after.logoKey).toMatch(new RegExp(`^${w.pastatti.id}/`));
    expect((await readBusinessLogo(w.ctx, w.owner, w.pastatti.id))?.bytes).toEqual(png(400, 200));
  });

  it("test_s014_rf25_solo_el_dueno_sube_o_quita", async () => {
    const w = await catalogWorld();
    expect(await code(setBusinessLogo(w.ctx, w.senderoAdmin, w.pastatti.id, png(10, 10)))).toBe("forbidden");
    expect(await code(removeBusinessLogo(w.ctx, w.senderoAdmin, w.pastatti.id))).toBe("forbidden");
  });

  it("test_s014_rf26_se_rechaza_lo_que_no_es_png_o_pasa_de_2_mb", async () => {
    const w = await catalogWorld();
    expect(await code(setBusinessLogo(w.ctx, w.owner, w.pastatti.id, new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])))).toBe("logo_invalid");
    expect(await code(setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(10, 10, 2 * 1024 * 1024)))).toBe("logo_invalid");
    expect((await w.ctx.store.businesses.findById(w.pastatti.id))?.logoKey).toBeNull();
  });

  it("test_s014_rf27_se_cambia_y_se_quita", async () => {
    const w = await catalogWorld();
    const first = await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(100, 100));
    const second = await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(300, 100));
    expect(second.logoKey).not.toBe(first.logoKey);
    expect((await readBusinessLogo(w.ctx, w.owner, w.pastatti.id))?.width).toBe(300);
    // El archivo anterior se conserva (nada se borra), aunque ya no se sirve.
    expect(await w.ctx.ports.files.get(first.logoKey!)).not.toBeNull();
    await removeBusinessLogo(w.ctx, w.owner, w.pastatti.id);
    expect(await readBusinessLogo(w.ctx, w.owner, w.pastatti.id)).toBeNull();
  });

  it("test_s014_rf33_el_logo_solo_lo_ve_quien_tiene_acceso_al_negocio", async () => {
    const w = await catalogWorld();
    await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(50, 50));
    expect(await readBusinessLogo(w.ctx, w.senderoAdmin, w.pastatti.id)).not.toBeNull();
    expect(await code(readBusinessLogo(w.ctx, w.pirrusAdmin, w.pastatti.id))).toBe("not_found");
    expect(await code(readBusinessLogo(w.ctx, w.owner, "no-es-uuid"))).toBe("not_found");
  });

  it("test_s014_rf34_queda_registro_de_subir_cambiar_y_quitar", async () => {
    const w = await catalogWorld();
    await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(50, 50));
    await setBusinessLogo(w.ctx, w.owner, w.pastatti.id, png(60, 60));
    await removeBusinessLogo(w.ctx, w.owner, w.pastatti.id);
    const actions = (await auditEntriesFor(db, "business", w.pastatti.id)).map((e) => e.action).filter((a) => a.startsWith("business.logo"));
    expect(actions).toEqual(["business.logo_removed", "business.logo_changed", "business.logo_set"]);
  });
});
