import { describe, expect, it } from "vitest";
import { BUSINESS_COLORS } from "@/domain/business-color";
import { contrast } from "./contrast";
import { readTokens } from "./read-tokens";

const { light, dark } = readTokens();
const MODES = { claro: light, oscuro: dark } as const;

// Pares texto/fondo (4.5:1) y bordes de controles o foco (3:1) que la interfaz usa (plan 002, tabla de tokens).
const TEXT_PAIRS: [string, string][] = [
  ["--ink", "--page"],
  ["--ink", "--surface"],
  ["--ink", "--primary-soft"],
  ["--ink-muted", "--page"],
  ["--ink-muted", "--surface"],
  ["--on-primary", "--primary"],
  ["--on-primary", "--primary-hover"],
  ["--primary", "--surface"],
  ["--primary", "--page"],
  ["--primary", "--primary-soft"],
  ["--success", "--success-soft"],
  ["--warning", "--warning-soft"],
  ["--danger", "--danger-soft"],
  ["--danger", "--surface"],
  ["--on-danger", "--danger"],
];
// Banda azul (dirección Tablero): título, subtítulo y número en ámbar sobre la banda.
const BAND_PAIRS: [string, string][] = [
  ["--on-band", "--band"],
  ["--band-muted", "--band"],
  ["--band-accent", "--band"],
];
const UI_PAIRS: [string, string][] = [
  ["--line-strong", "--surface"],
  ["--focus", "--page"],
  ["--focus", "--surface"],
  ["--accent-text", "--page"],
];

describe("spec 002 — contraste del sistema de diseño", () => {
  it("test_s002_nf_contraste_tokens_en_modo_claro_y_oscuro", () => {
    const fails: string[] = [];
    for (const [mode, b] of Object.entries(MODES)) {
      // En oscuro, lo que no se redefine se hereda del modo claro, igual que en el navegador.
      const v = { ...light[":root"], ...b[":root"] };
      for (const [fg, bg] of TEXT_PAIRS) {
        const r = contrast(v[fg], v[bg]);
        if (r < 4.5) fails.push(`${mode}: ${fg} sobre ${bg} = ${r.toFixed(2)}`);
      }
      for (const [fg, bg] of BAND_PAIRS) {
        const r = contrast(v[fg], v[bg]);
        if (r < 4.5) fails.push(`${mode}: ${fg} sobre ${bg} = ${r.toFixed(2)}`);
      }
      for (const [fg, bg] of UI_PAIRS) {
        const r = contrast(v[fg], v[bg]);
        if (r < 3) fails.push(`${mode}: ${fg} sobre ${bg} = ${r.toFixed(2)}`);
      }
    }
    expect(fails).toEqual([]);
  });

  it("test_s002_nf_contraste_colores_de_negocio_en_los_dos_modos", () => {
    const fails: string[] = [];
    for (const [mode, b] of Object.entries(MODES)) {
      const root = b[":root"];
      for (const key of BUSINESS_COLORS) {
        const v = b[`.biz-${key}`];
        expect(v, `falta .biz-${key} en modo ${mode}`).toBeDefined();
        const band = light[`.biz-${key}`]["--biz-band"];
        if (contrast(band, root["--band"]) < 3) fails.push(`${mode} ${key}: punto en la banda = ${contrast(band, root["--band"]).toFixed(2)}`);
        for (const [fg, bg] of [
          [v["--biz"], root["--surface"]],
          [v["--biz"], v["--biz-soft"]],
          [root["--ink"], v["--biz-soft"]],
        ]) {
          const r = contrast(fg, bg);
          if (r < 4.5) fails.push(`${mode} ${key}: ${fg} sobre ${bg} = ${r.toFixed(2)}`);
        }
      }
    }
    expect(fails).toEqual([]);
  });

  it("test_s002_rf8_la_paleta_de_negocio_tiene_8_colores_definidos_en_los_dos_modos", () => {
    expect(BUSINESS_COLORS).toHaveLength(8);
    for (const b of [light, dark]) for (const key of BUSINESS_COLORS) expect(b[`.biz-${key}`]?.["--biz"]).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
