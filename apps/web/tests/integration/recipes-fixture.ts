// Escenario del recetario (spec 004) sobre el del catálogo: Pirrus con camarón (bolsa de 2 kg), pepino, limón (caja
// de 20 kg) y salsa negra en ml; Pastatti con harina. Devuelve los ids para armar recetas.
import { addPresentation, createProduct, updateProduct } from "@/server/services/catalog/products";
import { catalogWorld } from "./catalog-fixture";

export async function recipesWorld() {
  const w = await catalogWorld();
  const make = async (name: string, baseUnit: "g" | "ml" | "pz", purchase?: [string, string]) => {
    const product = await createProduct(w.ctx, w.ownerPirrus, { name, baseUnit });
    if (purchase) {
      const p = await addPresentation(w.ctx, w.ownerPirrus, product.id, { name: purchase[0], factor: purchase[1] });
      await updateProduct(w.ctx, w.ownerPirrus, product.id, { purchasePresentationId: p.id, countPresentationId: p.id });
      return { id: product.id, presentationId: p.id };
    }
    return { id: product.id, presentationId: null };
  };
  const camaron = await make("Camarón crudo (Aguachile)", "g", ["Bolsa", "2000"]);
  const pepino = await make("Pepino", "g");
  const limon = await make("Limón", "g", ["Caja", "20000"]);
  const salsa = await make("Salsa negra Especial", "ml");
  const harina = await createProduct(w.ctx, w.ownerSendero, { name: "Harina", baseUnit: "g" });
  return { ...w, camaron, pepino, limon, salsa, harina };
}
