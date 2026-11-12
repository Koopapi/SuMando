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
