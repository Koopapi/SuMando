import type { Ports, Store } from "../ports";

/** Lo que recibe cada servicio: repositorios (puertos) y adaptadores inyectables. */
export interface Ctx {
  store: Store;
  ports: Ports;
}
