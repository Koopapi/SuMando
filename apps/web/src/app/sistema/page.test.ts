import { afterEach, describe, expect, it } from "vitest";
import SystemPage from "./page";

const saved = process.env.DEV_ENDPOINTS;
afterEach(() => {
  if (saved === undefined) delete process.env.DEV_ENDPOINTS;
  else process.env.DEV_ENDPOINTS = saved;
});

describe("spec 002 — catálogo", () => {
  it("test_s002_rf42_sin_dev_endpoints_el_catalogo_responde_no_encontrado", () => {
    delete process.env.DEV_ENDPOINTS;
    let digest = "";
    try {
      SystemPage();
    } catch (e) {
      digest = String((e as { digest?: string }).digest);
    }
    expect(digest).toContain("404");
  });

  it("test_s002_rf40_con_dev_endpoints_el_catalogo_se_muestra", () => {
    process.env.DEV_ENDPOINTS = "1";
    expect(SystemPage()).toBeTruthy();
  });
});
