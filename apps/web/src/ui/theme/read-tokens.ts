// Lee `tokens.css` y devuelve las variables de cada selector, en modo claro y en modo oscuro. Solo para tests.
import { readFileSync } from "node:fs";
import path from "node:path";

export type Vars = Record<string, string>;
export type Blocks = Record<string, Vars>;

function blocks(css: string): Blocks {
  const out: Blocks = {};
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    const vars: Vars = {};
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[d[1]] = d[2].trim();
    out[selector] = { ...out[selector], ...vars };
  }
  return out;
}

export function readTokens(file = path.resolve(import.meta.dirname, "../tokens.css")): { light: Blocks; dark: Blocks } {
  const css = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const start = css.indexOf("@media (prefers-color-scheme: dark)");
  if (start < 0) throw new Error("tokens.css no tiene bloque de modo oscuro");
  let depth = 0;
  let i = css.indexOf("{", start);
  const open = i;
  for (; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) break;
  }
  const dark = css.slice(open + 1, i);
  const rest = css.slice(0, start) + css.slice(i + 1);
  return { light: blocks(rest.replace(/@theme[^{]*\{[^}]*\}/g, "")), dark: blocks(dark) };
}
