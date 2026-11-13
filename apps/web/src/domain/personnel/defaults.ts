// Lista inicial de documentos de cada negocio (spec 008, RF-16): la hoja «Documentos» que hoy se pide al contratar.
export const DEFAULT_DOCUMENTS: { name: string; validityMonths: number | null }[] = [
  { name: "Acta de nacimiento", validityMonths: null },
  { name: "CURP", validityMonths: null },
  { name: "INE", validityMonths: null },
  { name: "Comprobante de domicilio", validityMonths: 3 },
  { name: "Constancia de situación fiscal", validityMonths: 12 },
  { name: "Número de Seguridad Social", validityMonths: null },
  { name: "Constancias laborales o cartas de recomendación", validityMonths: null },
  { name: "Mapa del domicilio", validityMonths: null },
  { name: "Fotos del domicilio", validityMonths: null },
  { name: "CV o solicitud", validityMonths: null },
  { name: "Comprobante de estudios", validityMonths: null },
  { name: "Estado de cuenta", validityMonths: null },
  { name: "Contactos de emergencia", validityMonths: null },
];
