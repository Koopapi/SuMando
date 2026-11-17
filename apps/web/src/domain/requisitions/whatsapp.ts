// Lista del comprador por WhatsApp (spec 013, RF-12 a RF-14, RF-16). Reglas puras: el texto se compone con los
// textos de la interfaz que recibe; el envío lo hace quien opera al abrir el enlace desde su teléfono.

/** RF-12 y RF-14: solo dígitos; 10 dígitos son un número de México (52); menos de 10 = sin destinatario. */
export function whatsappPhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

/** RF-12 y RF-14: enlace `wa.me` con el mensaje; sin número, WhatsApp pide elegir a quién. */
export const whatsappLink = (phone: string | null, text: string) => `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;

export interface MessageTexts {
  header(business: string, branch: string, folio: number): string;
  supplier(name: string): string;
  noSupplier: string;
  line(product: string, quantity: string): string;
  note(note: string): string;
}

export interface MessageSupplier {
  /** Nulo = sin proveedor. */
  name: string | null;
  lines: { product: string; quantity: string }[];
}

/** RF-13: encabezado, cada proveedor con sus renglones y la nota de la requisición si tiene. */
export function buyerMessage(texts: MessageTexts, head: { business: string; branch: string; folio: number }, suppliers: MessageSupplier[], note: string | null): string {
  const parts = [texts.header(head.business, head.branch, head.folio)];
  for (const s of suppliers) parts.push("", s.name === null ? texts.noSupplier : texts.supplier(s.name), ...s.lines.map((l) => texts.line(l.product, l.quantity)));
  if (note) parts.push("", texts.note(note));
  return parts.join("\n");
}
