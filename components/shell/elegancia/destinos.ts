/* El menú del prototipo Elegancia: exactamente estas puertas, en este orden. */
export interface Destino {
  clave: string;
  href: string;
  icono: string;
  nombre: string;
  /** Prefijos de ruta que marcan esta puerta como activa. */
  activa: string[];
  bandeja?: boolean;
}

export const MENU: Destino[] = [
  { clave: "resumen", href: "/app/resumen", icono: "dash", nombre: "Resumen", activa: ["/app/resumen"] },
  { clave: "embudo", href: "/app/embudo", icono: "kanban", nombre: "Embudo", activa: ["/app/embudo", "/app/kanban", "/app/pipelines"] },
  { clave: "bandeja", href: "/app/inbox?filter=all", icono: "inbox", nombre: "Bandeja", activa: ["/app/inbox"], bandeja: true },
  { clave: "contactos", href: "/app/contacts", icono: "users", nombre: "Contactos", activa: ["/app/contacts", "/app/people", "/app/companies"] },
  { clave: "agenda", href: "/app/agenda", icono: "cal", nombre: "Agenda", activa: ["/app/agenda"] },
  { clave: "finanzas", href: "/app/finanzas", icono: "wallet", nombre: "Finanzas", activa: ["/app/finanzas"] },
];

export const ABAJO: Destino[] = [
  { clave: "novedades", href: "/app/novedades", icono: "spark", nombre: "Novedades", activa: ["/app/novedades"] },
  { clave: "conexiones", href: "/app/connections", icono: "plug", nombre: "Conexiones", activa: ["/app/connections"] },
  { clave: "configuracion", href: "/app/settings", icono: "gear", nombre: "Configuración", activa: ["/app/settings"] },
];

export function estaActiva(d: Destino, ruta: string): boolean {
  return d.activa.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
