// Archivos en disco (spec 008, plan sección 5): `FILES_DIR` o `data/files`; en Coolify, un volumen persistente.
// Las claves son aleatorias y se validan para que nunca salgan del directorio.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "../ports/files";

const KEY = /^[0-9a-f-]{36}\/[0-9a-f-]{36}$/;

export function localFiles(dir = process.env.FILES_DIR || path.join(process.cwd(), "data", "files")): FileStore {
  const where = (key: string) => {
    if (!KEY.test(key)) throw new Error("clave de archivo inválida");
    return path.join(dir, key);
  };
  return {
    put: async (key, data) => {
      const file = where(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data, { flag: "wx", mode: 0o600 });
    },
    get: async (key) => {
      try {
        return new Uint8Array(await readFile(where(key)));
      } catch (e) {
        if ((e as { code?: string }).code === "ENOENT") return null;
        throw e;
      }
    },
  };
}
