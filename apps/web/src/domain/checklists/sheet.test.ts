import { describe, expect, it } from "vitest";
import { allOkTargets, allReady, keyPending, orderForPosition, pendingAtClose, type SheetItemState } from "./sheet";

const item = (itemId: string, kind: SheetItemState["kind"], isKey = false, done = false): SheetItemState => ({ itemId, kind, isKey, done });

describe("spec 010 — reglas de la hoja", () => {
  it("test_s010_rf25_todo_en_orden_palomea_lo_que_falta", () => {
    expect(allOkTargets([item("a", "check"), item("b", "check", false, true), item("c", "comment")])).toEqual(["a"]);
  });

  it("test_s010_rf26_todo_en_orden_no_toca_clave_ni_foto", () => {
    expect(allOkTargets([item("k", "check", true), item("f", "photo"), item("fk", "photo", true)])).toEqual([]);
  });

  it("test_s010_rf27_rf28_lista_solo_sin_clave_pendiente", () => {
    expect(keyPending([item("k", "check", true), item("f", "photo", true, true), item("n", "check")])).toBe(1);
    expect(keyPending([item("k", "check", true, true)])).toBe(0);
  });

  it("test_s010_rf31_la_hoja_esta_completa_con_todas_las_secciones_listas", () => {
    expect(allReady([{ ready: true }, { ready: true }])).toBe(true);
    expect(allReady([{ ready: true }, { ready: false }])).toBe(false);
    expect(allReady([])).toBe(false);
  });

  it("test_s010_rf33_pendientes_al_cerrar", () => {
    const p = pendingAtClose([
      { sectionId: "s1", name: "Caja", positionId: null, ready: true, items: [] },
      { sectionId: "s2", name: "Barra", positionId: null, ready: false, items: [item("gas", "check", true), item("x", "check")], itemsText: { gas: "Gas cerrado" } },
    ]);
    expect(p).toEqual([{ sectionId: "s2", name: "Barra", keyItems: ["Gas cerrado"] }]);
  });

  it("test_s010_rf19_primero_las_secciones_del_puesto", () => {
    const s = [
      { id: "a", positionId: "caja" },
      { id: "b", positionId: "cocina" },
      { id: "c", positionId: null },
      { id: "d", positionId: "cocina" },
    ];
    expect(orderForPosition(s, "cocina").map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
    expect(orderForPosition(s, null).map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
  });
});
