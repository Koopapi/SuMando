import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { xlsx, zip } from "../../../tests/support/xlsx";
import { MAX_FILE_BYTES, readWorkbook } from "./xlsx";

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return "sin error";
};

describe("spec 004 — lector de .xlsx", () => {
  it("test_s004_rf40_lee_cada_hoja_con_sus_filas_y_columnas", () => {
    const file = xlsx([
      { name: "NEGRO ", rows: [["NEGRO "], ["Ingredientes ", "Cantidad bruta ", "unidad", "Nota "], ["pepino", 60, "Gramos ", "1 puño lunas "], [], ["1.- Colocar <pepino> & sal"]] },
      { name: "VERDE", rows: [["VERDE"], [null, "Cantidad"]] },
    ]);
    const book = readWorkbook(file);
    expect(book.sheets.map((s) => s.name)).toEqual(["NEGRO ", "VERDE"]);
    expect(book.sheets[0].rows).toEqual([["NEGRO "], ["Ingredientes ", "Cantidad bruta ", "unidad", "Nota "], ["pepino", "60", "Gramos ", "1 puño lunas "], ["1.- Colocar <pepino> & sal"]]);
    expect(book.sheets[1].rows[1]).toEqual(["", "Cantidad"]);
  });

  it("test_s004_rf40_normaliza_los_numeros_que_excel_guarda_con_ruido", () => {
    const book = readWorkbook(xlsx([{ name: "A", rows: [["sal", 0.4, 1.2000000000000002, 0.1]] }]));
    expect(book.sheets[0].rows[0]).toEqual(["sal", "0.4", "1.2", "0.1"]);
  });

  it("test_s004_rf40_lee_tambien_zip_sin_comprimir_y_texto_en_linea", () => {
    const sheet = `<worksheet><sheetData><row r="1"><c r="B1" t="inlineStr"><is><t>hola</t></is></c><c r="C1" t="b"><v>1</v></c></row></sheetData></worksheet>`;
    const file = zip(
      {
        "xl/workbook.xml": `<workbook><sheets><sheet name="H&amp;1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="/xl/worksheets/sheet1.xml"/></Relationships>`,
        "xl/worksheets/sheet1.xml": sheet,
      },
      false,
    );
    const book = readWorkbook(file);
    expect(book.sheets[0]).toEqual({ name: "H&1", rows: [["", "hola", "TRUE"]], numbers: [1] });
  });

  it("test_s004_rf48_un_archivo_que_no_es_xlsx_se_rechaza", () => {
    expect(codeOf(() => readWorkbook(Buffer.from("nombre,cantidad\npepino,60")))).toBe("invalid_file");
    expect(codeOf(() => readWorkbook(Buffer.alloc(0)))).toBe("invalid_file");
    const broken = xlsx([{ name: "A", rows: [["x"]] }]);
    expect(codeOf(() => readWorkbook(broken.subarray(0, broken.length - 40)))).toBe("invalid_file");
    expect(codeOf(() => readWorkbook(zip({ "hola.txt": "hola" })))).toBe("invalid_file");
  });

  it("test_s004_rf48_un_archivo_de_mas_de_2_mb_se_rechaza", () => {
    expect(MAX_FILE_BYTES).toBe(2 * 1024 * 1024);
    const big = Buffer.concat([xlsx([{ name: "A", rows: [["x"]] }]), Buffer.alloc(MAX_FILE_BYTES)]);
    expect(codeOf(() => readWorkbook(big))).toBe("file_too_large");
  });

  it("test_s004_rf48_mas_de_200_hojas_se_rechaza", () => {
    const many = xlsx(Array.from({ length: 201 }, (_, i) => ({ name: `H${i}`, rows: [["x"]] })));
    expect(codeOf(() => readWorkbook(many))).toBe("invalid_file");
    expect(readWorkbook(xlsx(Array.from({ length: 200 }, (_, i) => ({ name: `H${i}`, rows: [["x"]] })))).sheets).toHaveLength(200);
  });

  it("test_s004_rf48_un_contenido_que_se_infla_de_mas_se_rechaza", () => {
    // 40 MB de ceros se comprimen a unos KB: el lector no debe descomprimirlos.
    const bomb = zip({
      "xl/workbook.xml": `<workbook><sheets><sheet name="A" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
      "xl/worksheets/sheet1.xml": Buffer.alloc(40 * 1024 * 1024, 32),
    });
    expect(bomb.length).toBeLessThan(MAX_FILE_BYTES);
    expect(codeOf(() => readWorkbook(bomb))).toBe("invalid_file");
  });
});

describe("spec 006 — lector de .xlsx para la hoja de inventario", () => {
  const book = xlsx([{ name: "Inventario por áreas", rows: [["ÁREA", "ARTÍCULO", "UNIDAD"], [null], ["BEBIDAS", "Bohemia", "PIEZA"]] }]);

  it("test_s006_rf5_las_imagenes_del_libro_no_cuentan_ni_se_descomprimen", () => {
    // Un libro como la base de Sendero: hoja pequeña y 35 MB de fotos.
    const files = { "xl/media/image1.png": Buffer.alloc(35 * 1024 * 1024, 7) };
    const withImages = zip({ ...unzipEntries(book), ...files });
    expect(withImages.length).toBeLessThan(2 * 1024 * 1024);
    expect(readWorkbook(withImages, { maxBytes: 40 * 1024 * 1024 }).sheets[0].rows).toHaveLength(2);
  });

  it("test_s006_rf8_el_limite_de_tamano_se_elige_por_llamada", () => {
    const big = Buffer.concat([book, Buffer.alloc(3 * 1024 * 1024)]);
    expect(codeOf(() => readWorkbook(big))).toBe("file_too_large");
    expect(codeOf(() => readWorkbook(big, { maxBytes: 40 * 1024 * 1024 }))).not.toBe("file_too_large");
  });

  it("test_s006_rf22_cada_fila_conserva_su_numero_de_excel", () => {
    expect(readWorkbook(book).sheets[0].numbers).toEqual([1, 3]);
  });
});

/** Entradas de un zip hecho por `xlsx()` para armar otro con archivos de más. */
function unzipEntries(buf: Buffer): Record<string, Buffer> {
  const out: Record<string, Buffer> = {};
  let p = 0;
  while (buf.readUInt32LE(p) === 0x04034b50) {
    const packed = buf.readUInt32LE(p + 18);
    const nameLen = buf.readUInt16LE(p + 26);
    const name = buf.toString("utf8", p + 30, p + 30 + nameLen);
    const data = buf.subarray(p + 30 + nameLen, p + 30 + nameLen + packed);
    out[name] = buf.readUInt16LE(p + 8) === 8 ? inflateRawSync(data) : data;
    p += 30 + nameLen + packed;
  }
  return out;
}
