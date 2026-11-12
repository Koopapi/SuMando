// Lector mínimo de .xlsx (spec 004, RF-40 y RF-48; plan, sección 3). Sin dependencias: el zip se recorre por su
// directorio central y cada entrada se infla con `zlib`. Solo lee el libro, sus relaciones, los textos compartidos
// y las hojas, y devuelve el texto de cada celda. Con límites para que un archivo malicioso no agote la memoria.
import { inflateRawSync } from "node:zlib";
import { AppError } from "../errors";

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SHEETS = 200;
const MAX_ROWS = 2000;
const MAX_INFLATED_BYTES = 30 * 1024 * 1024;

export interface Sheet {
  name: string;
  /** Filas con algún valor, en orden; cada celda como texto («» si está vacía). */
  rows: string[][];
}

const invalid = () => new AppError("invalid_file");

interface Entry {
  method: number;
  packed: number;
  size: number;
  offset: number;
}

function entries(buf: Buffer): Map<string, Entry> {
  if (buf.length < 22 || buf.readUInt32LE(0) !== 0x04034b50) throw invalid();
  let end = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw invalid();
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  const map = new Map<string, Entry>();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw invalid();
    const nameLen = buf.readUInt16LE(p + 28);
    const entry: Entry = { method: buf.readUInt16LE(p + 10), packed: buf.readUInt32LE(p + 20), size: buf.readUInt32LE(p + 24), offset: buf.readUInt32LE(p + 42) };
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    total += entry.size;
    if (total > MAX_INFLATED_BYTES) throw invalid();
    map.set(name, entry);
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return map;
}

function read(buf: Buffer, files: Map<string, Entry>, name: string): string | null {
  const e = files.get(name);
  if (!e) return null;
  if (e.offset + 30 > buf.length || buf.readUInt32LE(e.offset) !== 0x04034b50) throw invalid();
  const start = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
  const data = buf.subarray(start, start + e.packed);
  if (data.length !== e.packed) throw invalid();
  try {
    if (e.method === 0) return data.toString("utf8");
    if (e.method === 8) return inflateRawSync(data, { maxOutputLength: Math.max(e.size, 1) }).toString("utf8");
  } catch {
    throw invalid();
  }
  throw invalid();
}

const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (_, ent: string) => {
    const e = ent.toLowerCase();
    if (e.startsWith("#x")) return String.fromCodePoint(parseInt(e.slice(2), 16));
    if (e.startsWith("#")) return String.fromCodePoint(parseInt(e.slice(1), 10));
    return { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" }[e] ?? "";
  });

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]) : null;
};

/** Texto de un `<si>` o `<is>`: todas sus corridas `<t>`, sin la guía fonética. */
const runs = (xml: string) =>
  [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>|<t(?:\s[^>]*)?\/>/g)].map((m) => decode(m[1] ?? "")).join("");

/** Excel guarda 0.4 como 0.40000000000000002: se deja en 12 cifras significativas. */
function number(raw: string): string {
  const n = Number(raw);
  return Number.isFinite(n) ? String(Number(n.toPrecision(12))) : raw;
}

function column(ref: string | null, fallback: number): number {
  const letters = ref ? /^[A-Z]+/.exec(ref)?.[0] : undefined;
  if (!letters) return fallback;
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function sheetRows(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const row of xml.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells: string[] = [];
    for (const cell of (row[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = cell[1];
      const body = cell[2] ?? "";
      const type = attr(tag, "t");
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let text = "";
      if (type === "s") text = v === undefined ? "" : (shared[Number(v)] ?? "");
      else if (type === "inlineStr") text = runs(/<is>([\s\S]*?)<\/is>/.exec(body)?.[1] ?? "");
      else if (type === "b") text = v === "1" ? "TRUE" : "FALSE";
      else if (type === "str" || type === "e") text = decode(v ?? "");
      else text = v === undefined ? "" : number(v);
      const at = column(attr(tag, "r"), cells.length);
      while (cells.length < at) cells.push("");
      cells[at] = text;
    }
    while (cells.length && cells[cells.length - 1] === "") cells.pop();
    if (cells.length) rows.push(cells);
    if (rows.length > MAX_ROWS) throw invalid();
  }
  return rows;
}

const resolve = (target: string) => (target.startsWith("/") ? target.slice(1) : `xl/${target}`).replace(/\/\.\//g, "/");

export function readWorkbook(buf: Buffer): { sheets: Sheet[] } {
  if (buf.length > MAX_FILE_BYTES) throw new AppError("file_too_large");
  const files = entries(buf);
  const workbook = read(buf, files, "xl/workbook.xml");
  const relsXml = read(buf, files, "xl/_rels/workbook.xml.rels");
  if (!workbook || !relsXml) throw invalid();
  const rels = new Map<string, string>();
  for (const m of relsXml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attr(m[0], "Id");
    const target = attr(m[0], "Target");
    if (id && target) rels.set(id, resolve(target));
  }
  const sharedXml = read(buf, files, "xl/sharedStrings.xml");
  const shared = sharedXml ? [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => runs(m[1])) : [];
  const list = [...workbook.matchAll(/<sheet\b[^>]*>/g)];
  if (list.length === 0 || list.length > MAX_SHEETS) throw invalid();
  const sheets = list.map((m) => {
    const name = attr(m[0], "name") ?? "";
    const path = rels.get(attr(m[0], "r:id") ?? "");
    const xml = path ? read(buf, files, path) : null;
    if (xml === null) throw invalid();
    return { name, rows: sheetRows(xml, shared) };
  });
  return { sheets };
}
