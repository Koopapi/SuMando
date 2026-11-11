export const home = {
  title: "Inicio",
  greeting: (name: string) => `Hola, ${name}`,
  activeBranch: "Sucursal activa",
  switchBranch: "Cambiar de sucursal",
  password: "Cambiar contraseña",
  admin: "Administración",
  adminIntro: "Solo el dueño ve esta sección.",
  businesses: "Negocios",
  people: "Personas",
  modulesSoon: "Los módulos de catálogo, inventarios, requisiciones, personal, nómina y checklists llegan en las siguientes specs.",
} as const;
