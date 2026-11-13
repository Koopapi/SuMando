import type { FileStore } from "@/server/ports/files";

/** Archivos en memoria para las pruebas. */
export class MemoryFiles implements FileStore {
  readonly data = new Map<string, Uint8Array>();
  async put(key: string, data: Uint8Array) {
    if (this.data.has(key)) throw new Error("ya existe");
    this.data.set(key, data);
  }
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
}
