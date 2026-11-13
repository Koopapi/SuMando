// Spec 003: servicios del catálogo contra la BD de pruebas (pertenencia, permisos, unicidad, archivo, auditoría).
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { auditEntriesFor } from "@/server/adapters/drizzle/store";
import { setArchived } from "@/server/services/catalog/archive";
import { setLevel } from "@/server/services/catalog/levels";
import { createArea, createWarehouse, listAreas, listWarehouses, renameWarehouse, updateArea } from "@/server/services/catalog/places";
import { addPresentation, createProduct, updatePresentation, updateProduct } from "@/server/services/catalog/products";
import { createSupplier, listSuppliers, updateSupplier } from "@/server/services/catalog/suppliers";
import { catalogView } from "@/server/services/catalog/views";
import { updatePerson } from "@/server/services/people";
import { catalogWorld } from "./catalog-fixture";

const code = (p: Promise<unknown>) => p.then(() => "ok", (e: { code?: string }) => e.code ?? String(e));

describe("spec 003 — pertenencia y permisos", () => {
  it("test_s003_rf1_productos_y_proveedores_son_de_un_solo_negocio", async () => {
    const w = await catalogWorld();
    await createSupplier(w.ctx, w.ownerSendero, { name: "Lácteos del Norte" });
    await createProduct(w.ctx, w.ownerSendero, { name: "Queso", baseUnit: "g" });
    // El mismo nombre en Pirrus es otro producto y otro proveedor, independientes.
    await createSupplier(w.ctx, w.ownerPirrus, { name: "Lácteos del Norte" });
    await createProduct(w.ctx, w.ownerPirrus, { name: "Queso", baseUnit: "g" });
    const pastatti = await catalogView(w.ctx, w.ownerSendero);
    const pirrus = await catalogView(w.ctx, w.ownerPirrus);
    expect(pastatti.products.map((p) => p.id)).not.toContain(pirrus.products[0].id);
    expect(pastatti.suppliers).toHaveLength(1);
    expect(pirrus.suppliers).toHaveLength(1);
  });

  it("test_s003_rf2_rf3_rf5_areas_de_sucursal_y_almacenes_de_sucursal_o_de_negocio", async () => {
    const w = await catalogWorld();
    await createWarehouse(w.ctx, w.ownerSendero, { name: "Cámara fría", scope: "branch" });
    await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega central", scope: "business" });
    await createWarehouse(w.ctx, w.ownerCentro, { name: "Alacena", scope: "branch" });
    await createArea(w.ctx, w.ownerSendero, { name: "Cocina", responsibleId: w.owner.id });
    await createArea(w.ctx, w.ownerCentro, { name: "Barra", responsibleId: w.owner.id });
    expect((await listWarehouses(w.ctx, w.ownerSendero)).map((x) => x.name)).toEqual(["Bodega central", "Cámara fría"]);
    expect((await listWarehouses(w.ctx, w.ownerCentro)).map((x) => x.name)).toEqual(["Alacena", "Bodega central"]);
    expect((await listAreas(w.ctx, w.ownerSendero)).map((x) => x.name)).toEqual(["Cocina"]);
    expect((await listAreas(w.ctx, w.ownerCentro)).map((x) => x.name)).toEqual(["Barra"]);
    expect(await code(createWarehouse(w.ctx, w.ownerSendero, { name: "Otro", scope: "nowhere" }))).toBe("validation");
    const view = await catalogView(w.ctx, w.ownerSendero);
    expect(view.warehouses.map((x) => [x.name, x.scope])).toEqual([["Bodega central", "business"], ["Cámara fría", "branch"]]);
  });

  it("test_s003_rf4_con_una_sucursal_activa_solo_se_ve_el_catalogo_de_su_negocio", async () => {
    const w = await catalogWorld();
    await createProduct(w.ctx, w.ownerSendero, { name: "Harina", baseUnit: "g" });
    await createProduct(w.ctx, w.ownerPirrus, { name: "Tortilla", baseUnit: "pz" });
    expect((await catalogView(w.ctx, w.adminSendero)).products.map((p) => p.name)).toEqual(["Harina"]);
    expect((await catalogView(w.ctx, w.adminPirrus)).products.map((p) => p.name)).toEqual(["Tortilla"]);
  });

  it("test_s003_rf6_un_administrador_con_una_sucursal_administra_el_catalogo_del_negocio", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.adminSendero, { name: "Abarrotes" });
    const product = await createProduct(w.ctx, w.adminSendero, { name: "Aceite", baseUnit: "ml", supplierId: supplier.id });
    const warehouse = await createWarehouse(w.ctx, w.adminSendero, { name: "Bodega central", scope: "business" });
    expect((await updateProduct(w.ctx, w.adminSendero, product.id, { notes: "Comprar en garrafa" })).notes).toBe("Comprar en garrafa");
    expect((await setArchived(w.ctx, w.adminSendero, "warehouses", warehouse.id, true)).archivedAt).not.toBeNull();
    expect((await setArchived(w.ctx, w.adminSendero, "warehouses", warehouse.id, false)).archivedAt).toBeNull();
    expect((await updateSupplier(w.ctx, w.adminSendero, supplier.id, { phone: "555 123 4567" })).phone).toBe("555 123 4567");
  });

  it("test_s003_rf7_un_administrador_no_toca_almacenes_ni_areas_de_otra_sucursal", async () => {
    const w = await catalogWorld();
    const alacena = await createWarehouse(w.ctx, w.ownerCentro, { name: "Alacena", scope: "branch" });
    const barra = await createArea(w.ctx, w.ownerCentro, { name: "Barra", responsibleId: w.owner.id });
    expect(await code(renameWarehouse(w.ctx, w.adminSendero, alacena.id, { name: "Alacena 2" }))).toBe("forbidden");
    expect(await code(setArchived(w.ctx, w.adminSendero, "warehouses", alacena.id, true))).toBe("forbidden");
    expect(await code(updateArea(w.ctx, w.adminSendero, barra.id, { name: "Barra 2" }))).toBe("forbidden");
    expect(await code(setArchived(w.ctx, w.adminSendero, "areas", barra.id, true))).toBe("forbidden");
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    expect(await code(setLevel(w.ctx, w.adminSendero, product.id, { warehouseId: alacena.id, min: "1" }))).toBe("forbidden");
  });

  it("test_s003_rf8_lo_de_otro_negocio_no_existe_para_quien_pregunta", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes" });
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const warehouse = await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "business" });
    expect(await code(updateProduct(w.ctx, w.adminPirrus, product.id, { name: "Robado" }))).toBe("not_found");
    expect(await code(updateSupplier(w.ctx, w.adminPirrus, supplier.id, { name: "Robado" }))).toBe("not_found");
    expect(await code(setArchived(w.ctx, w.adminPirrus, "warehouses", warehouse.id, true))).toBe("not_found");
    expect(await code(createProduct(w.ctx, w.adminPirrus, { name: "Tortilla", baseUnit: "pz", supplierId: supplier.id }))).toBe("not_found");
    // Ni siquiera el dueño, mientras trabaja en Pirrus.
    expect(await code(updateProduct(w.ctx, w.ownerPirrus, product.id, { name: "Otro" }))).toBe("not_found");
    expect(await code(updateProduct(w.ctx, w.ownerPirrus, "00000000-0000-0000-0000-000000000000", { name: "Otro" }))).toBe("not_found");
  });
});

describe("spec 003 — productos y presentaciones", () => {
  it("test_s003_rf9_alta_de_producto_con_unidad_base_proveedor_y_notas", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes" });
    const product = await createProduct(w.ctx, w.ownerSendero, { name: " Aceite  de oliva ", baseUnit: "ml", supplierId: supplier.id, notes: "Extra virgen" });
    expect(product).toMatchObject({ name: "Aceite de oliva", baseUnit: "ml", supplierId: supplier.id, notes: "Extra virgen", archivedAt: null });
    const bare = await createProduct(w.ctx, w.ownerSendero, { name: "Huevo", baseUnit: "pz" });
    expect(bare).toMatchObject({ supplierId: null, notes: null });
  });

  it("test_s003_rf10_solo_se_acepta_gramo_mililitro_o_pieza", async () => {
    const w = await catalogWorld();
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "Arroz", baseUnit: "kg" }))).toBe("invalid_unit");
  });

  it("test_s003_rf11_rf12_presentaciones_con_equivalencia_y_la_unidad_base_implicita", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Botella", factor: "1000" });
    await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Caja", factor: "6000" });
    const view = (await catalogView(w.ctx, w.ownerSendero)).products[0];
    expect(view.presentations.map((p) => [p.name, p.factor])).toEqual([[null, "1"], ["Botella", "1000"], ["Caja", "6000"]]);
  });

  it("test_s003_rf13_la_equivalencia_invalida_se_rechaza", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    for (const factor of ["0", "-1", "1.2345", "uno"]) expect(await code(addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Botella", factor }))).toBe("invalid_factor");
  });

  it("test_s003_rf14_no_se_repite_el_nombre_de_una_presentacion_en_el_producto", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const other = await createProduct(w.ctx, w.ownerSendero, { name: "Vinagre", baseUnit: "ml" });
    await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Botella", factor: "1000" });
    expect(await code(addPresentation(w.ctx, w.ownerSendero, product.id, { name: " botella", factor: "750" }))).toBe("duplicate_name");
    expect(await code(addPresentation(w.ctx, w.ownerSendero, product.id, { name: "ML", factor: "1" }))).toBe("duplicate_name");
    expect(await code(addPresentation(w.ctx, w.ownerSendero, other.id, { name: "Botella", factor: "750" }))).toBe("ok");
  });

  it("test_s003_rf15_presentaciones_de_compra_y_de_conteo", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    expect(product).toMatchObject({ purchasePresentationId: null, countPresentationId: null });
    const botella = await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Botella", factor: "1000" });
    const caja = await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Caja", factor: "6000" });
    const updated = await updateProduct(w.ctx, w.ownerSendero, product.id, { purchasePresentationId: caja.id, countPresentationId: botella.id });
    expect(updated).toMatchObject({ purchasePresentationId: caja.id, countPresentationId: botella.id });
    const other = await createProduct(w.ctx, w.ownerSendero, { name: "Vinagre", baseUnit: "ml" });
    expect(await code(updateProduct(w.ctx, w.ownerSendero, other.id, { countPresentationId: botella.id }))).toBe("not_found");
    expect((await updateProduct(w.ctx, w.ownerSendero, product.id, { purchasePresentationId: null })).purchasePresentationId).toBeNull();
  });

  it("test_s003_rf16_la_unidad_base_no_cambia", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    expect(await code(updateProduct(w.ctx, w.ownerSendero, product.id, { baseUnit: "g" }))).toBe("base_unit_locked");
    expect((await updateProduct(w.ctx, w.ownerSendero, product.id, { baseUnit: "ml", name: "Aceite vegetal" })).name).toBe("Aceite vegetal");
  });

  it("test_s003_rf28_proveedor_habitual_del_mismo_negocio_o_ninguno", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes" });
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    expect((await updateProduct(w.ctx, w.ownerSendero, product.id, { supplierId: supplier.id })).supplierId).toBe(supplier.id);
    expect((await updateProduct(w.ctx, w.ownerSendero, product.id, { supplierId: null })).supplierId).toBeNull();
    const pirrusSupplier = await createSupplier(w.ctx, w.ownerPirrus, { name: "Tortillería" });
    expect(await code(updateProduct(w.ctx, w.ownerSendero, product.id, { supplierId: pirrusSupplier.id }))).toBe("not_found");
  });

  it("test_s003_rf35_un_proveedor_archivado_se_conserva_pero_no_se_asigna_de_nuevo", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes" });
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml", supplierId: supplier.id });
    await setArchived(w.ctx, w.ownerSendero, "suppliers", supplier.id, true);
    const view = (await catalogView(w.ctx, w.ownerSendero)).products[0];
    expect(view.supplier).toEqual({ id: supplier.id, name: "Abarrotes", archived: true });
    // Editar otra cosa conserva la relación.
    expect((await updateProduct(w.ctx, w.ownerSendero, product.id, { notes: "x", supplierId: supplier.id })).supplierId).toBe(supplier.id);
    const other = await createProduct(w.ctx, w.ownerSendero, { name: "Vinagre", baseUnit: "ml" });
    expect(await code(updateProduct(w.ctx, w.ownerSendero, other.id, { supplierId: supplier.id }))).toBe("supplier_archived");
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "Sal", baseUnit: "g", supplierId: supplier.id }))).toBe("supplier_archived");
  });
});

describe("spec 003 — almacenes, áreas y mínimos", () => {
  it("test_s003_rf18_alta_de_almacen_de_sucursal_o_de_negocio", async () => {
    const w = await catalogWorld();
    const branch = await createWarehouse(w.ctx, w.adminSendero, { name: "Cámara fría", scope: "branch" });
    const business = await createWarehouse(w.ctx, w.adminSendero, { name: "Bodega", scope: "business" });
    expect(branch).toMatchObject({ branchId: w.sendero.id, businessId: w.pastatti.id });
    expect(business).toMatchObject({ branchId: null, businessId: w.pastatti.id });
  });

  it("test_s003_rf19_el_area_lleva_un_responsable_con_acceso_a_la_sucursal", async () => {
    const w = await catalogWorld();
    const area = await createArea(w.ctx, w.adminSendero, { name: "Cocina", responsibleId: w.senderoAdmin.id });
    expect(area).toMatchObject({ branchId: w.sendero.id, responsibleId: w.senderoAdmin.id });
    expect(await code(createArea(w.ctx, w.adminSendero, { name: "Barra", responsibleId: w.pirrusAdmin.id }))).toBe("invalid_responsible");
    expect(await code(createArea(w.ctx, w.adminSendero, { name: "Barra", responsibleId: undefined }))).toBe("invalid_responsible");
    // Pierde la sucursal: el área lo conserva y lo marca sin acceso.
    await updatePerson(w.ctx, w.owner, w.senderoAdmin.id, { branchIds: [w.centro.id] });
    const view = await catalogView(w.ctx, w.ownerSendero);
    expect(view.areas[0].responsible).toMatchObject({ id: w.senderoAdmin.id, hasAccess: false });
    expect((await updateArea(w.ctx, w.ownerSendero, area.id, { responsibleId: w.owner.id })).responsibleId).toBe(w.owner.id);
  });

  it("test_s003_rf20_unicidad_de_almacenes_entre_sucursal_y_negocio", async () => {
    const w = await catalogWorld();
    await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "branch" });
    expect(await code(createWarehouse(w.ctx, w.ownerSendero, { name: "bodega", scope: "branch" }))).toBe("duplicate_name");
    expect(await code(createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "business" }))).toBe("duplicate_name");
    // Otra sucursal sí puede tener su «Bodega».
    expect(await code(createWarehouse(w.ctx, w.ownerCentro, { name: "Bodega", scope: "branch" }))).toBe("ok");
    await createWarehouse(w.ctx, w.ownerSendero, { name: "Central", scope: "business" });
    expect(await code(createWarehouse(w.ctx, w.ownerCentro, { name: "Central", scope: "branch" }))).toBe("duplicate_name");
    // Pirrus no choca con Pastatti.
    expect(await code(createWarehouse(w.ctx, w.ownerPirrus, { name: "Central", scope: "business" }))).toBe("ok");
  });

  it("test_s003_rf21_unicidad_de_areas_en_la_sucursal", async () => {
    const w = await catalogWorld();
    await createArea(w.ctx, w.ownerSendero, { name: "Cocina", responsibleId: w.owner.id });
    expect(await code(createArea(w.ctx, w.ownerSendero, { name: "COCINA ", responsibleId: w.owner.id }))).toBe("duplicate_name");
    expect(await code(createArea(w.ctx, w.ownerCentro, { name: "Cocina", responsibleId: w.owner.id }))).toBe("ok");
  });

  it("test_s003_rf22_rf23_rf26_minimo_y_maximo_por_almacen_capturados_en_cualquier_presentacion", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const botella = await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Botella", factor: "1000" });
    const caja = await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Caja", factor: "6000" });
    await updateProduct(w.ctx, w.ownerSendero, product.id, { countPresentationId: botella.id });
    const camara = await createWarehouse(w.ctx, w.ownerSendero, { name: "Cámara", scope: "branch" });
    const bodega = await createWarehouse(w.ctx, w.ownerSendero, { name: "Bodega", scope: "business" });
    const level = await setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, presentationId: caja.id, min: "2", max: "3,5" });
    expect(level).toMatchObject({ minBase: "12000.000000", maxBase: "21000.000000" });
    await setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: bodega.id, min: "500" });
    const view = (await catalogView(w.ctx, w.ownerSendero)).products[0];
    expect(view.levels[camara.id]).toEqual({ min: "12", max: "21" });
    expect(view.levels[bodega.id]).toEqual({ min: "0.5", max: null });
    // Ambos opcionales: se pueden quitar.
    await setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: bodega.id, min: "", max: null });
    expect((await catalogView(w.ctx, w.ownerSendero)).products[0].levels[bodega.id]).toEqual({ min: null, max: null });
  });

  it("test_s003_rf17_cambiar_la_equivalencia_conserva_el_minimo_en_unidad_base", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const caja = await addPresentation(w.ctx, w.ownerSendero, product.id, { name: "Caja", factor: "6000" });
    await updateProduct(w.ctx, w.ownerSendero, product.id, { countPresentationId: caja.id });
    const camara = await createWarehouse(w.ctx, w.ownerSendero, { name: "Cámara", scope: "branch" });
    await setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, presentationId: caja.id, min: "2" });
    await updatePresentation(w.ctx, w.ownerSendero, caja.id, { factor: "12000" });
    expect((await catalogView(w.ctx, w.ownerSendero)).products[0].levels[camara.id].min).toBe("1");
    expect((await w.ctx.store.catalog.levels.find(product.id, camara.id))!.minBase).toBe("12000.000000");
  });

  it("test_s003_rf24_rf25_maximo_menor_o_cantidad_negativa_se_rechazan", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const camara = await createWarehouse(w.ctx, w.ownerSendero, { name: "Cámara", scope: "branch" });
    expect(await code(setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, min: "5", max: "4" }))).toBe("max_below_min");
    expect(await code(setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, min: "-1" }))).toBe("invalid_quantity");
    expect(await code(setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, min: "5", max: "5" }))).toBe("ok");
  });

  it("test_s003_rf36_un_almacen_archivado_conserva_y_oculta_sus_minimos", async () => {
    const w = await catalogWorld();
    const product = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    const camara = await createWarehouse(w.ctx, w.ownerSendero, { name: "Cámara", scope: "branch" });
    await setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, min: "100" });
    await setArchived(w.ctx, w.ownerSendero, "warehouses", camara.id, true);
    expect((await catalogView(w.ctx, w.ownerSendero)).products[0].levels).toEqual({});
    expect(await code(setLevel(w.ctx, w.ownerSendero, product.id, { warehouseId: camara.id, min: "1" }))).toBe("not_found");
    await setArchived(w.ctx, w.ownerSendero, "warehouses", camara.id, false);
    expect((await catalogView(w.ctx, w.ownerSendero)).products[0].levels[camara.id]).toEqual({ min: "100", max: null });
  });
});

describe("spec 003 — proveedores, nombres, archivo y registro", () => {
  it("test_s003_rf27_rf29_proveedor_con_telefono_y_notas_y_sus_productos", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes", phone: " 555 000 1111 ", notes: "Entrega martes" });
    expect(supplier).toMatchObject({ phone: "555 000 1111", notes: "Entrega martes" });
    await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml", supplierId: supplier.id });
    await createProduct(w.ctx, w.ownerSendero, { name: "Arroz", baseUnit: "g", supplierId: supplier.id });
    await createProduct(w.ctx, w.ownerSendero, { name: "Huevo", baseUnit: "pz" });
    expect((await catalogView(w.ctx, w.ownerSendero)).suppliers[0].products.map((p) => p.name)).toEqual(["Aceite", "Arroz"]);
  });

  it("test_s003_rf30_rf31_rf32_nombres_unicos_sin_acentos_y_con_limite", async () => {
    const w = await catalogWorld();
    await createProduct(w.ctx, w.ownerSendero, { name: "Azúcar", baseUnit: "g" });
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "azucar ", baseUnit: "g" }))).toBe("duplicate_name");
    await createSupplier(w.ctx, w.ownerSendero, { name: "Lácteos" });
    expect(await code(createSupplier(w.ctx, w.ownerSendero, { name: "LACTEOS" }))).toBe("duplicate_name");
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "  ", baseUnit: "g" }))).toBe("catalog_name_invalid");
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "a".repeat(81), baseUnit: "g" }))).toBe("catalog_name_invalid");
    expect(await code(createProduct(w.ctx, w.ownerSendero, { name: "a".repeat(80), baseUnit: "g" }))).toBe("ok");
  });

  it("test_s003_rf33_rf34_archivar_conserva_y_reactivar_solo_sin_choque_de_nombre", async () => {
    const w = await catalogWorld();
    const old = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml", notes: "Lo de antes" });
    await setArchived(w.ctx, w.ownerSendero, "products", old.id, true);
    const view = (await catalogView(w.ctx, w.ownerSendero)).products[0];
    expect(view).toMatchObject({ name: "Aceite", archived: true, notes: "Lo de antes" });
    // Lo archivado no bloquea un alta nueva con el mismo nombre…
    const fresh = await createProduct(w.ctx, w.ownerSendero, { name: "Aceite", baseUnit: "ml" });
    // …pero no se reactiva mientras el activo exista.
    expect(await code(setArchived(w.ctx, w.ownerSendero, "products", old.id, false))).toBe("duplicate_name");
    await setArchived(w.ctx, w.ownerSendero, "products", fresh.id, true);
    expect((await setArchived(w.ctx, w.ownerSendero, "products", old.id, false)).archivedAt).toBeNull();
    const area = await createArea(w.ctx, w.ownerSendero, { name: "Cocina", responsibleId: w.owner.id });
    await setArchived(w.ctx, w.ownerSendero, "areas", area.id, true);
    await createArea(w.ctx, w.ownerSendero, { name: "Cocina", responsibleId: w.owner.id });
    expect(await code(setArchived(w.ctx, w.ownerSendero, "areas", area.id, false))).toBe("duplicate_name");
    const s = await createSupplier(w.ctx, w.ownerSendero, { name: "Abarrotes" });
    await setArchived(w.ctx, w.ownerSendero, "suppliers", s.id, true);
    expect((await listSuppliers(w.ctx, w.ownerSendero))[0].archivedAt).not.toBeNull();
  });

  it("test_s003_rf38_cada_cambio_queda_con_autor_fecha_y_valor_anterior", async () => {
    const w = await catalogWorld();
    const supplier = await createSupplier(w.ctx, w.adminSendero, { name: "Abarrotes" });
    await updateSupplier(w.ctx, w.adminSendero, supplier.id, { name: "Abarrotes Norte" });
    await setArchived(w.ctx, w.adminSendero, "suppliers", supplier.id, true);
    await setArchived(w.ctx, w.adminSendero, "suppliers", supplier.id, false);
    const log = await auditEntriesFor(db, "supplier", supplier.id);
    expect(log.map((a) => a.action).reverse()).toEqual(["supplier.created", "supplier.updated", "supplier.archived", "supplier.reactivated"]);
    expect(log.every((a) => a.actorId === w.senderoAdmin.id && a.businessId === w.pastatti.id && a.createdAt instanceof Date)).toBe(true);
    expect(log.find((a) => a.action === "supplier.updated")).toMatchObject({ before: { name: "Abarrotes" }, after: { name: "Abarrotes Norte" } });
    const product = await createProduct(w.ctx, w.adminSendero, { name: "Aceite", baseUnit: "ml" });
    const caja = await addPresentation(w.ctx, w.adminSendero, product.id, { name: "Caja", factor: "6000" });
    await updatePresentation(w.ctx, w.adminSendero, caja.id, { factor: "12000" });
    expect((await auditEntriesFor(db, "presentation", caja.id)).find((a) => a.action === "presentation.updated")).toMatchObject({ before: { factor: "6000.000" }, after: { factor: "12000.000" } });
    const camara = await createWarehouse(w.ctx, w.adminSendero, { name: "Cámara", scope: "branch" });
    const level = await setLevel(w.ctx, w.adminSendero, product.id, { warehouseId: camara.id, min: "10" });
    await setLevel(w.ctx, w.adminSendero, product.id, { warehouseId: camara.id, min: "20" });
    expect((await auditEntriesFor(db, "stock_level", level.id))[0]).toMatchObject({ before: { minBase: "10.000000" }, after: { minBase: "20.000000" } });
    const area = await createArea(w.ctx, w.adminSendero, { name: "Cocina", responsibleId: w.senderoAdmin.id });
    expect((await auditEntriesFor(db, "area", area.id))[0].action).toBe("area.created");
    expect((await auditEntriesFor(db, "warehouse", camara.id))[0].action).toBe("warehouse.created");
    expect((await auditEntriesFor(db, "product", product.id))[0].action).toBe("product.created");
  });
});
