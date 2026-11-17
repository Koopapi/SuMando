// Menú de SuMando por áreas de trabajo (spec 014, RF-1 a RF-3, RF-5 a RF-7). Reglas puras: qué destinos ve cada rol,
// en qué categoría, cuáles van en la barra del teléfono y cuál está activo para una ruta.

export type NavIcon = "home" | "chart" | "clipboard" | "cash" | "layers" | "cart" | "box" | "truck" | "warehouse" | "recipe" | "calculator" | "idcard" | "store" | "users";
export type NavKey = "home" | "dashboard" | "checklists" | "cash" | "inventory" | "requisitions" | "products" | "suppliers" | "places" | "recipes" | "supplies" | "personnel" | "payroll" | "businesses" | "people";
export type GroupKey = "daily" | "purchasing" | "kitchen" | "team" | "admin";

export interface NavItem {
  href: string;
  key: NavKey;
  icon: NavIcon;
}

export interface NavGroup {
  key: GroupKey | "general";
  items: NavItem[];
}

const item = (href: string, key: NavKey, icon: NavIcon): NavItem => ({ href, key, icon });

const TOP = [item("/", "home", "home"), item("/tablero", "dashboard", "chart")];
const GROUPS: { key: GroupKey; ownerOnly?: boolean; items: NavItem[] }[] = [
  { key: "daily", items: [item("/checklists", "checklists", "clipboard"), item("/caja", "cash", "cash")] },
  {
    key: "purchasing",
    items: [item("/inventario", "inventory", "layers"), item("/requisiciones", "requisitions", "cart"), item("/productos", "products", "box"), item("/proveedores", "suppliers", "truck"), item("/almacenes", "places", "warehouse")],
  },
  { key: "kitchen", items: [item("/recetas", "recipes", "recipe"), item("/insumos", "supplies", "calculator")] },
  { key: "team", items: [item("/personal", "personnel", "idcard"), item("/nomina", "payroll", "cash")] },
  { key: "admin", ownerOnly: true, items: [item("/negocios", "businesses", "store"), item("/personas", "people", "users")] },
];
const BAR = ["/", "/inventario", "/requisiciones", "/checklists"];

export function navigation(role: "owner" | "admin") {
  const groups = GROUPS.filter((g) => !g.ownerOnly || role === "owner").map((g) => ({ key: g.key, items: g.items }));
  const all = [...TOP, ...groups.flatMap((g) => g.items)];
  const bar = BAR.map((href) => all.find((i) => i.href === href)!);
  // RF-7: «Más» lleva lo que no está en la barra, con las mismas categorías.
  const more: NavGroup[] = [{ key: "general" as const, items: TOP.filter((i) => !BAR.includes(i.href)) }, ...groups.map((g) => ({ key: g.key, items: g.items.filter((i) => !BAR.includes(i.href)) }))].filter((g) => g.items.length > 0);
  return { top: TOP, groups, bar, more };
}

/** RF-5: el destino cuyo `href` es el prefijo más largo de la ruta, con «/» como límite. */
export function activeHref(path: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const h of hrefs) {
    const match = h === "/" ? path === "/" : path === h || path.startsWith(`${h}/`);
    if (match && (best === null || h.length > best.length)) best = h;
  }
  return best;
}
