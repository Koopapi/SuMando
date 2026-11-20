import { describe, expect, it } from "vitest";
import { WIZARD_KINDS } from "./drafts";
import { nextAfter } from "./next";

describe("spec 015 — qué sigue al terminar", () => {
  it("test_s015_rf9_cada_asistente_dice_que_sigue", () => {
    for (const kind of WIZARD_KINDS) expect(nextAfter(kind, { id: "x" }).href).toMatch(/^\//);
  });

  it("test_s015_rf9_tras_pedir_se_ve_la_requisicion_y_tras_comprar_se_recibe", () => {
    expect(nextAfter("req-new", { id: "r1" })).toEqual({ href: "/requisiciones/r1", key: "seeRequisition" });
    expect(nextAfter("req-buy", { id: "r1" })).toEqual({ href: "/requisiciones/r1/recibir", key: "receive" });
    expect(nextAfter("pay-close", { id: "2026-11-16" })).toEqual({ href: "/nomina/2026-11-16/hoja-de-pago", key: "paySheet" });
    // La asistencia lleva a la semana completa, no de vuelta al asistente.
    expect(nextAfter("pay-attendance", { id: "2026-11-16" })).toEqual({ href: "/nomina/2026-11-16?vista=completa", key: "seeWeek" });
  });
});
