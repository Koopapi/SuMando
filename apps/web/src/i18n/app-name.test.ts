import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { siteMetadata as metadata } from "@/app/site";
import { es } from "@/i18n";

// RF-3: el nombre visible es siempre «SuMando»; nunca «Mando» suelto, «Sumando» ni «SUMANDO».
const WRONG = [/(?<!Su)Mando\b/, /\bSumando\b/, /\bSUMANDO\b/];

function strings(value: unknown, path = "es"): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (typeof value === "function") {
    // Plantillas con parámetros: se evalúan con valores neutros para revisar su texto fijo.
    const out = (value as (...a: unknown[]) => unknown)({}, "x", "x");
    return typeof out === "string" ? [[path, out]] : [];
  }
  if (value && typeof value === "object") return Object.entries(value).flatMap(([k, v]) => strings(v, `${path}.${k}`));
  return [];
}

describe("spec 002 — nombre de la app", () => {
  it("test_s002_rf3_ningun_texto_de_la_interfaz_escribe_el_nombre_mal", () => {
    const bad = strings(es).filter(([, s]) => WRONG.some((re) => re.test(s)));
    expect(bad).toEqual([]);
    expect(es.common.appName).toBe("SuMando");
  });

  it("test_s002_rf2_el_manifiesto_instala_la_app_como_sumando", () => {
    const m = manifest();
    expect(m.name).toBe("SuMando");
    expect(m.short_name).toBe("SuMando");
  });

  it("test_s002_rf1_titulo_de_pestana_y_nombre_en_el_telefono_dicen_sumando", () => {
    expect(metadata.title).toEqual({ default: "SuMando", template: "%s · SuMando" });
    expect(metadata.applicationName).toBe("SuMando");
    expect(metadata.appleWebApp).toMatchObject({ title: "SuMando" });
  });
});

describe("spec 002 — color de la barra del navegador", () => {
  it("test_s002_rf7_la_barra_del_navegador_sigue_el_modo", async () => {
    const { siteViewport } = await import("@/app/site");
    expect(siteViewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: "#F5F6FA" },
      { media: "(prefers-color-scheme: dark)", color: "#0E1120" },
    ]);
  });
});
