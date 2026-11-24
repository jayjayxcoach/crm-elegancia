"use client";

/**
 * Barra lateral del prototipo Elegancia: una pastilla de vidrio flotante con
 * Resumen, Embudo, Bandeja, Contactos, Agenda, Finanzas · Conexiones,
 * Configuración · Contraer y Tema. Nada más.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { toggleSidebar } from "@/app/actions/shell/toggleSidebar";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useConversationCounts } from "@/hooks/inbox/useConversationCounts";
import { useTheme } from "@/lib/theme";

import { ABAJO, MENU, estaActiva, type Destino } from "./destinos";
import { Icono } from "./Iconos";

export function useCuentaBandeja(): number {
  const { activeOrg } = useAuth();
  const { data } = useConversationCounts(activeOrg?.orgId ?? null);
  return data?.fila ?? data?.unassigned ?? 0;
}

export function DockElegancia({ collapsed }: { collapsed: boolean }) {
  const ruta = usePathname() ?? "";
  const cuenta = useCuentaBandeja();
  const { resolvedTheme, setTheme } = useTheme();
  const [, startTransition] = useTransition();
  const oscuro = resolvedTheme === "dark";

  const boton = (d: Destino) => (
    <Link key={d.clave} href={d.href} className={`eleg-db ${estaActiva(d, ruta) ? "on" : ""}`} aria-label={d.nombre}>
      <Icono nombre={d.icono} />
      <span className="eleg-lb">{d.nombre}</span>
      {d.bandeja && cuenta > 0 && <span className="eleg-ct">{cuenta}</span>}
      <span className="eleg-tip">{d.nombre}</span>
    </Link>
  );

  return (
    <div className={`eleg-dock-lugar ${collapsed ? "" : "abierta"}`}>
      <nav className={`eleg-dock ${collapsed ? "" : "abierta"}`} aria-label="Menú">
        <div className="eleg-scroll">{MENU.map(boton)}</div>
        <div className="eleg-sep" />
        <div className="eleg-scroll">{ABAJO.map(boton)}</div>
        <div className="eleg-sep" />
        <button
          type="button"
          className="eleg-db"
          onClick={() => startTransition(() => toggleSidebar(collapsed))}
          aria-label={collapsed ? "Expandir" : "Contraer"}
        >
          <Icono nombre={collapsed ? "chev-r" : "chev-l"} />
          <span className="eleg-lb">Contraer</span>
          <span className="eleg-tip">{collapsed ? "Expandir" : "Contraer"}</span>
        </button>
        <button
          type="button"
          className="eleg-db"
          onClick={() => setTheme(oscuro ? "light" : "dark")}
          aria-label="Cambiar tema"
        >
          <Icono nombre={oscuro ? "sun" : "moon"} />
          <span className="eleg-lb">Tema</span>
          <span className="eleg-tip">Tema</span>
        </button>
      </nav>
    </div>
  );
}
