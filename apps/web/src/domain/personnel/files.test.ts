import { describe, expect, it } from "vitest";
import { FILE_MAX_BYTES, fileKind, fileProblem } from "./files";

const bytes = (...parts: (number[] | string)[]) => new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("spec 008 — archivos de documentos", () => {
  it("test_s008_rf18_se_aceptan_jpg_png_heic_webp_y_pdf_por_su_contenido", () => {
    expect(fileKind(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(fileKind(bytes([0x89], "PNG", [13, 10, 26, 10]))).toBe("image/png");
    expect(fileKind(bytes("%PDF-1.7"))).toBe("application/pdf");
    expect(fileKind(bytes("RIFF", [0, 0, 0, 0], "WEBP"))).toBe("image/webp");
    expect(fileKind(bytes([0, 0, 0, 24], "ftypheic"))).toBe("image/heic");
  });

  it("test_s008_rf20_otro_tipo_o_mas_de_10_mb_se_rechaza", () => {
    expect(fileProblem(bytes("GIF89a"))).toBe("file_type");
    expect(fileProblem(bytes("MZ"))).toBe("file_type");
    expect(fileProblem(new Uint8Array())).toBe("file_type");
    const big = new Uint8Array(FILE_MAX_BYTES + 1);
    big.set([0xff, 0xd8, 0xff]);
    expect(fileProblem(big)).toBe("file_size");
    expect(fileProblem(bytes([0xff, 0xd8, 0xff]))).toBeNull();
  });
});
