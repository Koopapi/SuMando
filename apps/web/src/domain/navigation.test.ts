import { describe, expect, it } from "vitest";
import { activeHref, navigation } from "./navigation";

const hrefs = (items: { href: string }[]) => items.map((i) => i.href);

describe("spec 014 — navegación", () => {
  it("test_s014_rf1_inicio_y_tablero_arriba_sin_categoria", () => {
    const nav = navigation("admin");
    expect(hrefs(nav.top)).toEqual(["/", "/tablero"]);
  });

  it("test_s014_rf2_categorias_por_area_de_trabajo_en_orden", () => {
    const nav = navigation("admin");
    expect(nav.groups.map((g) => [g.key, hrefs(g.items)])).toEqual([
      ["daily", ["/checklists", "/caja"]],
      ["purchasing", ["/inventario", "/requisiciones", "/productos", "/proveedores", "/almacenes"]],
      ["kitchen", ["/recetas", "/insumos"]],
      ["team", ["/personal", "/nomina"]],
    ]);
  });

  it("test_s014_rf3_administracion_solo_para_el_dueno", () => {
    expect(navigation("owner").groups.at(-1)).toMatchObject({ key: "admin", items: [{ href: "/negocios" }, { href: "/personas" }] });
    expect(navigation("admin").groups.some((g) => g.key === "admin")).toBe(false);
  });

  it("test_s014_rf6_la_barra_del_telefono_lleva_lo_diario", () => {
    expect(hrefs(navigation("owner").bar)).toEqual(["/", "/inventario", "/requisiciones", "/checklists"]);
  });

  it("test_s014_rf7_mas_lleva_lo_demas_por_categorias", () => {
    const more = navigation("owner").more;
    const all = more.flatMap((g) => hrefs(g.items));
    expect(all).toEqual(["/tablero", "/caja", "/productos", "/proveedores", "/almacenes", "/recetas", "/insumos", "/personal", "/nomina", "/negocios", "/personas"]);
    expect(more.every((g) => g.items.length > 0)).toBe(true);
  });

  it("test_s014_rf5_se_marca_el_destino_de_la_pantalla_abierta_y_de_sus_pantallas_internas", () => {
    const all = ["/", "/tablero", "/inventario", "/requisiciones", "/productos"];
    expect(activeHref("/requisiciones/123/editar", all)).toBe("/requisiciones");
    expect(activeHref("/inventario/datos-de-compra", all)).toBe("/inventario");
    expect(activeHref("/", all)).toBe("/");
    expect(activeHref("/productosx", all)).toBeNull();
    expect(activeHref("/cambiar-contrasena", all)).toBeNull();
  });
});
