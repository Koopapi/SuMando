// Spec 002, requisito no funcional «sin estilos sueltos»: las pantallas (`app/`, `features/`) solo usan componentes y
// valores del sistema de diseño. Prohibido: `style=`, valores arbitrarios de Tailwind, colores en hexadecimal y la
// paleta por defecto de Tailwind.
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(import.meta.dirname, "../..");

function walk(dir: string, out: string[] = []) {
  for (const f of readdirSync(dir)) {
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") && !p.endsWith(".test.tsx")) out.push(p);
  }
  return out;
}

const PALETTE = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white";
export const RULES: [string, RegExp][] = [
  ["style en línea", /\bstyle=\{/],
  ["valor arbitrario de Tailwind", /className=[^>]*?[\w:-]-\[[^\]]+\]/],
  ["color hexadecimal", /["'`\s]#[0-9a-fA-F]{3,8}\b/],
  ["color por defecto de Tailwind", new RegExp(`\\b(?:bg|text|border|ring|outline|fill|stroke|divide|from|to|via|decoration|shadow|accent|caret|placeholder)-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?\\b`)],
];

export function looseStyles(src: string): string[] {
  return RULES.flatMap(([name, re]) => (re.test(src) ? [name] : []));
}

describe("spec 002 — sin estilos sueltos", () => {
  it("test_s002_nf_la_revision_detecta_cada_tipo_de_estilo_suelto", () => {
    expect(looseStyles(`<div style={{ color: "red" }} />`)).toContain("style en línea");
    expect(looseStyles(`<div className="w-[13px]" />`)).toContain("valor arbitrario de Tailwind");
    expect(looseStyles(`const c = "#ff0000";`)).toContain("color hexadecimal");
    expect(looseStyles(`<p className="text-gray-500" />`)).toContain("color por defecto de Tailwind");
    expect(looseStyles(`<p className="bg-primary text-on-primary rounded-md" />`)).toEqual([]);
  });

  it("test_s002_rf43_las_pantallas_usan_solo_componentes_y_valores_del_sistema", () => {
    const files = ["app", "features"].flatMap((d) => walk(path.join(SRC, d)));
    const found = files.flatMap((f) => looseStyles(readFileSync(f, "utf8")).map((r) => `${path.relative(SRC, f)}: ${r}`));
    expect(found).toEqual([]);
  });
});
