// Spec 014, RF-25 y RF-26: la pantalla revisa tipo y tamaño, y convierte el logo a PNG de 512 px como máximo antes de
// subirlo (Excel no muestra WEBP y así el logo queda ligero). El servidor vuelve a comprobarlo.
import { LOGO_MAX_BYTES, LOGO_MAX_SIDE, acceptedLogoType } from "@/domain/business-logo";
import { es } from "@/i18n";

async function toPng(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("png"))), "image/png"));
}

/** Sube el logo; devuelve el mensaje de error en español o nulo si salió bien. */
export async function uploadLogo(businessId: string, file: File): Promise<string | null> {
  if (!acceptedLogoType(file.type) || file.size > LOGO_MAX_BYTES) return es.errors.logo_invalid;
  let png: Blob;
  try {
    png = await toPng(file);
  } catch {
    return es.errors.logo_invalid;
  }
  try {
    const res = await fetch(`/api/businesses/${businessId}/logo`, { method: "PUT", headers: { "content-type": "image/png" }, body: png });
    if (res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.error?.message ?? es.common.unknownError;
  } catch {
    return es.common.unknownError;
  }
}
