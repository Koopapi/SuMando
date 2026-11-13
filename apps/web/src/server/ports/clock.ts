/** Hora del servidor. Los servicios la reciben inyectada; los tests pasan un reloj falso. */
export interface Clock {
  now(): Date;
}
