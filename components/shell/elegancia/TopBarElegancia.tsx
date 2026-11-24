"use client";

/**
 * Barra superior del prototipo Elegancia: marca a la izquierda, pestañas en una
 * pastilla de vidrio al centro (Resumen, Embudo, Bandeja, Contactos, Agenda,
 * Finanzas) y a la derecha Bandeja, Avisos y la persona.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { setActiveOrg } from "@/app/actions/shell/setActiveOrg";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";

import { useAgentInbox } from "@/hooks/ai/useAgentInbox";
import { useOrganizationTransition } from "../OrganizationTransitionProvider";
import { UserMenu } from "../UserMenu";
import { useCuentaBandeja } from "./DockElegancia";
import { MENU, estaActiva } from "./destinos";
import { Icono } from "./Iconos";

/** Avisos (Central de avisos): siempre visible, con punto rojo cuando hay pendientes. */
function Avisos() {
  const { data } = useAgentInbox("open");
  const n = data?.open_count ?? 0;
  return (
    <Link className="eleg-cb" href="/app/ai/inbox" aria-label={n > 0 ? `Avisos — ${n} abiertos` : "Avisos"}>
      <Icono nombre="bell" />
      {n > 0 && <span className="eleg-punto" />}
    </Link>
  );
}

function Marca() {
  const user = useUser();
  const active = useActiveOrg();
  const transition = useOrganizationTransition();
  const [, setPending] = useState(false);
  const nombre = active?.marca?.nome || "Elegancia de Amor";
  const contenido = (
    <>
      <i className="eleg-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-mark.svg" alt="" className="eleg-logo-img" />
      </i>
      <span className="eleg-marca-nombre">{nombre}</span>
    </>
  );
  if (user.organizations.length <= 1) return <div className="eleg-marca">{contenido}</div>;

  const cambiar = async (orgId: string) => {
    if (orgId === active?.orgId) return;
    flushSync(() => {
      setPending(true);
      transition.begin("Cargando organización…");
    });
    try {
      const r = await setActiveOrg(orgId);
      if (!r.ok) throw new Error(r.error);
      window.location.assign("/app");
    } catch {
      transition.cancel();
      setPending(false);
      toast.error("No se pudo cambiar de organización. Intenta de nuevo.");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="eleg-marca" aria-label="Cambiar de organización">
          {contenido}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {user.organizations.map((o) => (
          <DropdownMenuItem key={o.organization_id} onSelect={() => void cambiar(o.organization_id)}>
            {o.organization_name}
            {o.organization_id === active?.orgId ? " ✓" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TopBarElegancia() {
  const ruta = usePathname() ?? "";
  const cuenta = useCuentaBandeja();
  return (
    <header className="eleg-top">
      <Marca />
      <nav className="eleg-tabs" aria-label="Secciones">
        {MENU.map((d) => (
          <Link key={d.clave} href={d.href} className={estaActiva(d, ruta) ? "on" : ""}>
            {d.nombre}
            {d.bandeja && cuenta > 0 && <b>{cuenta}</b>}
          </Link>
        ))}
      </nav>
      <div className="eleg-acts">
        <Link className="eleg-cb eleg-solo-pc" href="/app/inbox?filter=all" aria-label="Bandeja">
          <Icono nombre="inbox" />
        </Link>
        <Avisos />
        <div className="eleg-usuario">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
