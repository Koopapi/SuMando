import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { localFiles } from "./local-files";

const KEY = "00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000002";

describe("spec 008 — archivos en disco", () => {
  it("test_s008_rf18_guarda_y_lee_por_clave", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "sumando-files-"));
    try {
      const store = localFiles(dir);
      await store.put(KEY, new Uint8Array([1, 2, 3]));
      expect(await store.get(KEY)).toEqual(new Uint8Array([1, 2, 3]));
      expect(await store.get(KEY.replace("2", "3"))).toBeNull();
      await expect(store.put(KEY, new Uint8Array([9]))).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("test_s008_rf27_una_clave_no_puede_salir_del_directorio", async () => {
    const store = localFiles("/tmp/no-importa");
    await expect(store.get("../../etc/passwd")).rejects.toThrow("clave de archivo inválida");
  });
});
