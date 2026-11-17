// Escribe un libro de Excel (.xlsx) de una hoja, sin dependencias: XML de Office Open dentro de un zip hecho con
// `node:zlib` (spec 009, RF-45). Los textos van como cadenas en línea; los números, como celdas numéricas.
import { crc32, deflateRawSync } from "node:zlib";

export type CellValue = string | number | null;
/** Número exacto escrito como texto decimal (por ejemplo, pesos «1234.50»): se guarda como celda numérica. */
export class Num {
  constructor(readonly text: string) {}
}
export type Cell = CellValue | Num;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const col = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

function zip(entries: [string, string | Uint8Array][]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const data = typeof content === "string" ? Buffer.from(content, "utf8") : Buffer.from(content);
    const packed = deflateRawSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(packed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBuf, packed);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

function cellXml(v: Cell, ref: string): string {
  if (v === null || v === "") return "";
  if (v instanceof Num) return `<c r="${ref}"><v>${esc(v.text)}</v></c>`;
  if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
}

/** Spec 014, RF-32: logo (PNG) en el encabezado del libro, con su tamaño en píxeles. */
export interface WorkbookLogo {
  png: Uint8Array;
  width: number;
  height: number;
}

/** Filas que deja libres el logo arriba de los datos. */
export const LOGO_ROWS = 4;
const EMU = 9525;

export function writeWorkbook(sheetName: string, rows: Cell[][], opts: { logo?: WorkbookLogo | null } = {}): Buffer {
  const name = sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Hoja1";
  const logo = opts.logo ?? null;
  const offset = logo ? LOGO_ROWS : 0;
  const data = rows.map((row, r) => `<row r="${r + 1 + offset}">${row.map((v, c) => cellXml(v, `${col(c)}${r + 1 + offset}`)).join("")}</row>`).join("");
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const entries: [string, string | Uint8Array][] = [
    [
      "[Content_Types].xml",
      `${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${logo ? '<Default Extension="png" ContentType="image/png"/>' : ""}<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>${logo ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ""}</Types>`,
    ],
    ["_rels/.rels", `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml", `${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}"><sheets><sheet name="${esc(name)}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/worksheets/sheet1.xml", `${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${rel}"><sheetData>${data}</sheetData>${logo ? '<drawing r:id="rId1"/>' : ""}</worksheet>`],
  ];
  if (logo) {
    const cx = Math.round(logo.width * EMU);
    const cy = Math.round(logo.height * EMU);
    entries.push(
      ["xl/worksheets/_rels/sheet1.xml.rels", `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`],
      [
        "xl/drawings/drawing1.xml",
        `${xml}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${rel}"><xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:ext cx="${cx}" cy="${cy}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor></xdr:wsDr>`,
      ],
      ["xl/drawings/_rels/drawing1.xml.rels", `${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/image" Target="../media/logo.png"/></Relationships>`],
      ["xl/media/logo.png", logo.png],
    );
  }
  return zip(entries);
}
