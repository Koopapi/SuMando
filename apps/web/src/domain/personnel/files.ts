// Archivos de documentos (spec 008, RF-18, RF-20): el tipo se decide por la firma del contenido, no por el nombre.
export const FILE_MAX_BYTES = 10 * 1024 * 1024;
export type FileKind = "image/jpeg" | "image/png" | "image/webp" | "image/heic" | "application/pdf";

const ascii = (b: Uint8Array, at: number, text: string) => [...text].every((c, i) => b[at + i] === c.charCodeAt(0));

export function fileKind(b: Uint8Array): FileKind | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, "PNG")) return "image/png";
  if (b.length >= 4 && ascii(b, 0, "%PDF")) return "application/pdf";
  if (b.length >= 12 && ascii(b, 0, "RIFF") && ascii(b, 8, "WEBP")) return "image/webp";
  if (b.length >= 12 && ascii(b, 4, "ftyp") && ["heic", "heix", "mif1", "msf1", "hevc"].some((brand) => ascii(b, 8, brand))) return "image/heic";
  return null;
}

export type FileProblem = "file_type" | "file_size";

export function fileProblem(b: Uint8Array): FileProblem | null {
  if (b.length > FILE_MAX_BYTES) return "file_size";
  if (b.length === 0 || !fileKind(b)) return "file_type";
  return null;
}
