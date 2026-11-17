import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, acceptedLogoType, logoBox, pngSize } from "./business-logo";

/** Un PNG mínimo con el ancho y alto dados en su encabezado IHDR. */
function pngHeader(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, width);
  new DataView(b.buffer).setUint32(20, height);
  return b;
}

describe("spec 014 — logo del negocio", () => {
  it("test_s014_rf25_tipos_y_tamano_aceptados_en_la_pantalla", () => {
    expect(["image/png", "image/jpeg", "image/webp"].map(acceptedLogoType)).toEqual([true, true, true]);
    expect(acceptedLogoType("image/svg+xml")).toBe(false);
    expect(acceptedLogoType("application/pdf")).toBe(false);
    expect(LOGO_MAX_BYTES).toBe(2 * 1024 * 1024);
  });

  it("test_s014_rf26_el_servidor_solo_acepta_un_png_valido", () => {
    expect(pngSize(pngHeader(400, 200))).toEqual({ width: 400, height: 200 });
    expect(pngSize(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBeNull();
    expect(pngSize(pngHeader(0, 10))).toBeNull();
    expect(pngSize(new Uint8Array(10))).toBeNull();
  });

  it("test_s014_rf28_el_logo_se_ve_completo_dentro_de_su_cuadro", () => {
    expect(logoBox({ width: 400, height: 100 }, 48, 200)).toEqual({ width: 192, height: 48 });
    expect(logoBox({ width: 1000, height: 100 }, 48, 200)).toEqual({ width: 200, height: 20 });
    expect(logoBox({ width: 100, height: 300 }, 48, 200)).toEqual({ width: 16, height: 48 });
  });
});
