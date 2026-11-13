import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";

const root = path.resolve(import.meta.dirname, "../..");

function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString()).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("spec 002 — iconos", () => {
  it("test_s002_rf2_cada_icono_del_manifiesto_existe_con_su_tamano", () => {
    const icons = manifest().icons ?? [];
    expect(icons.map((i) => i.purpose)).toEqual(["any", "any", "maskable"]);
    for (const icon of icons) {
      const [w, h] = String(icon.sizes).split("x").map(Number);
      expect(pngSize(path.join(root, "public", icon.src))).toEqual({ width: w, height: h });
    }
  });

  it("test_s002_rf2_icono_de_apple_y_de_pestana_existen", () => {
    expect(pngSize(path.join(root, "src/app/apple-icon.png"))).toEqual({ width: 180, height: 180 });
    expect(pngSize(path.join(root, "src/app/icon.png"))).toEqual({ width: 64, height: 64 });
  });
});
