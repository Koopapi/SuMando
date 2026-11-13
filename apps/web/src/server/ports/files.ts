// Almacén de archivos (spec 008): guardar y leer por una clave que no revela a la persona.
export interface FileStore {
  put(key: string, data: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}
