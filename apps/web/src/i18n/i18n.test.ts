// Constitución, principio 11: ningún texto de la interfaz suelto en un componente; cada código de error con mensaje.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { es, translateError } from "./index";

const SRC = path.resolve(__dirname, "..");

function walk(dir: string, out: string[] = []) {
  if (!statSync(dir, { throwIfNoEntry: false })) return out;
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function stripComments(src: string) {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
}

const SPANISH = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
const TEXT_ATTRS = /\b(placeholder|aria-label|title|alt|label|aria-description)="([^"]*[A-Za-zÁ-ú][^"]*)"/g;

/**
 * Texto visible escrito directamente en un .tsx: dos o más palabras antes de una etiqueta de cierre, o un atributo
 * de texto. El cierre `</` evita confundir genéricos (`useState<string | null>(null)`) y flechas (`=>`) con texto.
 */
function looseText(src: string): string[] {
  const out: string[] = [];
  for (const m of stripComments(src).matchAll(/(?<!=)>([^<>{}]+)<\//g)) {
    const t = m[1].trim();
    if (t && (/\s/.test(t) || SPANISH.test(t))) out.push(t);
  }
  for (const m of stripComments(src).matchAll(TEXT_ATTRS)) out.push(`${m[1]}="${m[2]}"`);
  return out;
}

describe("spec 001 — idioma", () => {
  it("test_s001_nf_idioma_ningun_componente_escribe_texto_suelto", () => {
    const files = ["app", "features", "ui"].flatMap((d) => walk(path.join(SRC, d))).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"));
    const found = files.flatMap((f) => looseText(readFileSync(f, "utf8")).map((t) => `${path.relative(SRC, f)}: ${t}`));
    expect(found).toEqual([]);
  });

  it("test_s001_nf_idioma_cada_codigo_de_error_tiene_mensaje", () => {
    const codes = new Set<string>();
    for (const f of walk(path.join(SRC, "server")).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))) {
      for (const m of readFileSync(f, "utf8").matchAll(/new AppError\(\s*"([a-z0-9_]+)"/g)) codes.add(m[1]);
    }
    const missing = [...codes].filter((c) => !(c in es.errors));
    expect(missing).toEqual([]);
    expect(translateError("account_locked", { minutes: 1 })).toContain("1 minuto");
    expect(translateError("no_such_code")).toBe(es.common.unknownError);
  });
});
