import { describe, expect, it } from "vitest";
import { buyerMessage, whatsappLink, whatsappPhone, type MessageTexts } from "./whatsapp";

const texts: MessageTexts = {
  header: (business, branch, folio) => `${business} · ${branch} · Requisición ${folio}`,
  supplier: (name) => `*${name}*`,
  noSupplier: "*Sin proveedor*",
  line: (product, quantity) => `• ${product}: ${quantity}`,
  note: (note) => `Nota: ${note}`,
};

describe("spec 013 — teléfono de WhatsApp", () => {
  it("test_s013_rf12_diez_digitos_se_mandan_con_52", () => {
    expect(whatsappPhone("55 1234 5678")).toBe("525512345678");
    expect(whatsappPhone("(55) 1234-5678")).toBe("525512345678");
  });

  it("test_s013_rf12_con_lada_de_pais_se_respeta", () => {
    expect(whatsappPhone("+52 55 1234 5678")).toBe("525512345678");
    expect(whatsappPhone("+521 55 1234 5678")).toBe("5215512345678");
  });

  it("test_s013_rf14_sin_telefono_o_con_menos_de_10_digitos_no_hay_destinatario", () => {
    expect(whatsappPhone(null)).toBeNull();
    expect(whatsappPhone("")).toBeNull();
    expect(whatsappPhone("1234-567")).toBeNull();
  });

  it("test_s013_rf12_rf14_el_enlace_lleva_el_numero_o_ninguno", () => {
    expect(whatsappLink("525512345678", "Hola y adiós")).toBe("https://wa.me/525512345678?text=Hola%20y%20adi%C3%B3s");
    expect(whatsappLink(null, "Hola")).toBe("https://wa.me/?text=Hola");
  });
});

describe("spec 013 — mensaje al comprador", () => {
  it("test_s013_rf13_el_mensaje_lleva_encabezado_proveedores_renglones_y_nota", () => {
    const text = buyerMessage(
      texts,
      { business: "Pirrus", branch: "Centro", folio: 12 },
      [
        { name: "Sam's", lines: [{ product: "Harina", quantity: "20 Kilogramo" }, { product: "Pinol", quantity: "3 Bote" }] },
        { name: null, lines: [{ product: "Botiquín", quantity: "2 pz" }] },
      ],
      "Antes de las 10",
    );
    expect(text).toBe(["Pirrus · Centro · Requisición 12", "", "*Sam's*", "• Harina: 20 Kilogramo", "• Pinol: 3 Bote", "", "*Sin proveedor*", "• Botiquín: 2 pz", "", "Nota: Antes de las 10"].join("\n"));
  });

  it("test_s013_rf13_sin_nota_no_se_agrega_la_linea", () => {
    const text = buyerMessage(texts, { business: "B", branch: "S", folio: 1 }, [{ name: "P", lines: [{ product: "X", quantity: "1 pz" }] }], null);
    expect(text.endsWith("• X: 1 pz")).toBe(true);
  });

  it("test_s013_rf16_el_dominio_solo_compone_texto_y_enlace", () => {
    // El envío lo hace quien opera al abrir el enlace: aquí no hay red ni efectos.
    expect(typeof whatsappLink("525512345678", buyerMessage(texts, { business: "B", branch: "S", folio: 1 }, [], null))).toBe("string");
  });
});
