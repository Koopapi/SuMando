// Spec 012, requisito no funcional: el tablero responde en menos de 2 segundos con 3 negocios, 10 sucursales y un año
// de cortes, semanas de nómina y existencias (los datos se insertan directo en la BD de pruebas para no tardar).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { cashCutMethods, cashCuts, cashMovements, paymentMethods, payrollWeeks, products, stock, stockLevels, warehouses } from "@/db/schema";
import { addDays } from "@/domain/payroll/week";
import { addBranch, createBusiness } from "@/server/services/businesses";
import { dashboardPage } from "@/server/services/reports/dashboard";
import { createFirstOwner } from "@/server/services/setup";
import { makeCtx, OWNER } from "./helpers";

const chunks = async <T>(rows: T[], insert: (part: T[]) => Promise<unknown>) => {
  for (let i = 0; i < rows.length; i += 1000) await insert(rows.slice(i, i + 1000));
};

describe("spec 012 — volumen", () => {
  it("test_s012_nf_el_tablero_responde_en_menos_de_2_segundos_con_un_ano_de_datos", async () => {
    const ctx = makeCtx();
    const owner = (await createFirstOwner(ctx, OWNER)).user;
    const branches: { businessId: string; branchId: string }[] = [];
    for (const [i, count] of [4, 3, 3].entries()) {
      const { business, branch } = await createBusiness(ctx, owner, { name: `Negocio ${i + 1}`, firstBranchName: "Sucursal 1", color: "azul" });
      branches.push({ businessId: business.id, branchId: branch.id });
      for (let b = 2; b <= count; b++) branches.push({ businessId: business.id, branchId: (await addBranch(ctx, owner, business.id, { name: `Sucursal ${b}` })).id });
    }
    const today = "2026-11-11";
    const at = new Date("2026-11-11T12:00:00Z");
    for (const [n, { businessId, branchId }] of branches.entries()) {
      const methods = await db
        .insert(paymentMethods)
        .values(["Efectivo", "BBVA 1", "Transferencias"].map((name, sort) => ({ businessId, branchId, name, nameKey: name.toLowerCase(), isCash: sort === 0, sort })))
        .returning();
      const cuts = await db
        .insert(cashCuts)
        .values(Array.from({ length: 365 }, (_, d) => ({ businessId, branchId, date: addDays(today, -d), status: "closed" as const, openingFundCents: 50_000n, cashPieces: { "100000": 3, "50000": 1 }, openedAt: at, openedBy: "Cajero", posAt: at, closedAt: at, closedBy: owner.id })))
        .returning({ id: cashCuts.id });
      await chunks(
        cuts.flatMap((c) => methods.map((m) => ({ cutId: c.id, methodId: m.id, name: m.name, isCash: m.isCash, sort: m.sort, countedCents: m.isCash ? null : 100_000n, posCents: m.isCash ? 330_000n : 100_000n }))),
        (part) => db.insert(cashCutMethods).values(part),
      );
      await chunks(
        cuts.flatMap((c) => ["Hielo", "Gas", "Limpieza"].map((concept) => ({ cutId: c.id, kind: "expense" as const, concept, amountCents: 10_000n, createdAt: at, createdBy: "Cajero" }))),
        (part) => db.insert(cashMovements).values(part),
      );
      await db.insert(payrollWeeks).values(Array.from({ length: 52 }, (_, i) => ({ businessId, branchId, weekStart: addDays("2026-11-02", -7 * i), status: "closed" as const, totalCents: 1_200_000n, closedAt: at })));
      const [warehouse] = await db.insert(warehouses).values({ businessId, branchId, name: `Bodega ${n}`, nameKey: `bodega ${n}` }).returning();
      const items = await db
        .insert(products)
        .values(Array.from({ length: 150 }, (_, i) => ({ businessId, name: `Producto ${n}-${i}`, nameKey: `producto ${n}-${i}`, baseUnit: "pz" as const })))
        .returning({ id: products.id });
      await db.insert(stockLevels).values(items.map((p) => ({ businessId, productId: p.id, warehouseId: warehouse.id, minBase: "10", maxBase: "20" })));
      await db.insert(stock).values(items.map((p, i) => ({ businessId, productId: p.id, warehouseId: warehouse.id, quantityBase: String(i % 20) })));
    }
    // Una vuelta para calentar conexiones; se mide la siguiente: el rango más largo, con la sección más pesada.
    await dashboardPage(ctx, owner, { period: "range", from: addDays(today, -365), to: today }, "sales");
    const started = performance.now();
    const { summary, detail } = await dashboardPage(ctx, owner, { period: "range", from: addDays(today, -365), to: today }, "alerts");
    const ms = performance.now() - started;
    // Sin diferencias en los cortes; 80 de 150 productos de cada bodega bajo el mínimo.
    expect(summary.alerts).toBe(10 * 80);
    expect(detail?.section).toBe("alerts");
    expect(summary.figures.sales!.amount).toBe(String(10 * 365 * 5_300) + ".00");
    expect(ms, `${Math.round(ms)} ms`).toBeLessThan(2000);
  }, 120_000);
});
