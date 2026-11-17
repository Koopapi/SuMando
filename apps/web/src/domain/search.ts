// Búsqueda en listas y tablas (spec 002, RF-30): sin mayúsculas, sin acentos y con los espacios compactados.
export function searchKey(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Un renglón coincide si la clave de alguno de sus campos contiene la clave del texto buscado. */
export function matchesSearch(fields: string[], query: string): boolean {
  const q = searchKey(query);
  if (!q) return true;
  return fields.some((f) => searchKey(f).includes(q));
}

/** Spec 013, RF-29: las opciones cuyo texto contiene lo escrito (sin acentos ni mayúsculas); primero las que empiezan
 * con ello, hasta `limit`. */
export function filterOptions<T extends { label: string }>(options: T[], query: string, limit = 50): T[] {
  const q = searchKey(query);
  if (!q) return options.slice(0, limit);
  const starts: T[] = [];
  const contains: T[] = [];
  for (const o of options) {
    const k = searchKey(o.label);
    if (k.startsWith(q)) starts.push(o);
    else if (k.includes(q)) contains.push(o);
  }
  return [...starts, ...contains].slice(0, limit);
}
