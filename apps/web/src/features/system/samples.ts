// Datos de ejemplo de las pantallas tipo del catálogo (spec 002, RF-41). Nombres genéricos de productos y platillos;
// ninguna persona real. Nada se guarda.
export type StockStatus = "ok" | "low" | "out";

export interface SampleProduct {
  id: string;
  product: string;
  area: string;
  store: string;
  unit: string;
  stock: string;
  min: string;
  supplier: string;
  status: StockStatus;
}

const BASE: [string, string, string, number, number, string][] = [
  ["Queso manchego", "Lácteos", "kg", 4.5, 2, "Abarrotes del Centro"],
  ["Queso parmesano", "Lácteos", "kg", 1, 1.5, "Abarrotes del Centro"],
  ["Crema", "Lácteos", "L", 1, 3, "Abarrotes del Centro"],
  ["Mantequilla", "Lácteos", "kg", 2, 1, "Abarrotes del Centro"],
  ["Queso panela", "Lácteos", "kg", 0, 2, "Abarrotes del Centro"],
  ["Carne molida", "Proteínas", "kg", 0, 5, "Carnes Selectas"],
  ["Tocino", "Proteínas", "kg", 3, 2, "Carnes Selectas"],
  ["Jamón serrano", "Proteínas", "kg", 1.2, 1, "Carnes Selectas"],
  ["Pechuga de pollo", "Proteínas", "kg", 6, 4, "Carnes Selectas"],
  ["Camarón", "Proteínas", "kg", 2.5, 4, "Mariscos del Pacífico"],
  ["Atún fresco", "Proteínas", "kg", 3, 2, "Mariscos del Pacífico"],
  ["Jitomate", "Verduras", "kg", 12, 6, "Mercado de abastos"],
  ["Cebolla morada", "Verduras", "kg", 4, 3, "Mercado de abastos"],
  ["Cebolla blanca", "Verduras", "kg", 5, 3, "Mercado de abastos"],
  ["Champiñones", "Verduras", "kg", 2, 2, "Mercado de abastos"],
  ["Pepino", "Verduras", "kg", 1, 3, "Mercado de abastos"],
  ["Limón", "Verduras", "kg", 8, 5, "Mercado de abastos"],
  ["Albahaca", "Verduras", "manojo", 3, 4, "Mercado de abastos"],
  ["Chile serrano", "Verduras", "kg", 1, 1, "Mercado de abastos"],
  ["Aguacate", "Verduras", "kg", 4, 3, "Mercado de abastos"],
  ["Agua mineral 2 L", "Bebidas", "paquete", 8, 4, "Distribuidora local"],
  ["Refresco de cola 355 ml", "Bebidas", "caja", 3, 4, "Distribuidora local"],
  ["Cerveza clara 355 ml", "Bebidas", "caja", 10, 6, "Distribuidora local"],
  ["Jugo de tomate 2.5 L", "Bebidas", "pieza", 0, 2, "Distribuidora local"],
  ["Agua natural 500 ml", "Bebidas", "paquete", 6, 3, "Distribuidora local"],
  ["Pasta corta", "Abarrotes", "kg", 10, 5, "Abarrotes del Centro"],
  ["Pasta larga", "Abarrotes", "kg", 9, 5, "Abarrotes del Centro"],
  ["Aceite de oliva", "Abarrotes", "L", 2, 3, "Abarrotes del Centro"],
  ["Sal de grano", "Abarrotes", "kg", 4, 1, "Abarrotes del Centro"],
  ["Tostadas", "Abarrotes", "paquete", 12, 8, "Distribuidora local"],
];

const fmt = (n: number, unit: string) => `${n} ${unit}`;

export const SAMPLE_PRODUCTS: SampleProduct[] = ["Cocina", "Barra"].flatMap((store, s) =>
  BASE.map(([product, area, unit, stock, min, supplier], i) => {
    const qty = s === 0 ? stock : Math.max(0, Math.round((stock * 0.6 + (i % 3)) * 10) / 10);
    return { id: `${s}-${i}`, product, area, store, unit, stock: fmt(qty, unit), min: fmt(min, unit), supplier, status: qty === 0 ? "out" : qty < min ? "low" : "ok" };
  }),
);

export const SAMPLE_DISHES = [
  ["original", "Aguachile original"],
  ["rojo", "Aguachile rojo"],
  ["verde", "Aguachile verde"],
  ["negro", "Aguachile negro"],
  ["tropical", "Ceviche tropical"],
  ["charola", "Charola grande"],
  ["tostada", "Tostada de la casa"],
] as const;

export const SAMPLE_DISH_VALUES: Record<string, string> = { original: "11", rojo: "14", verde: "9", negro: "7", tropical: "6", charola: "4", tostada: "dos" };

export const DENOMINATIONS = [
  { id: "1000", value: 1000, kind: "bill" },
  { id: "500", value: 500, kind: "bill" },
  { id: "200", value: 200, kind: "bill" },
  { id: "100", value: 100, kind: "bill" },
  { id: "50", value: 50, kind: "bill" },
  { id: "20", value: 20, kind: "bill" },
  { id: "10", value: 10, kind: "coin" },
  { id: "5", value: 5, kind: "coin" },
  { id: "1", value: 1, kind: "coin" },
] as const;
