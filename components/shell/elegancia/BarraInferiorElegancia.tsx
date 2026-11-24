"use client";

/**
 * Barra de abajo en el celular (plantilla Elegancia): pegada abajo, en vidrio,
 * con Resumen, Embudo, Bandeja, Contactos y "Más". "Más" abre un panel con
 * Agenda, Finanzas, Conexiones, Configuración, el tema claro/oscuro y Buscar
 * (encontrar a una clienta por nombre y abrir su chat).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/lib/theme";
import { usePecaDoRodape, type PecaDoRodape } from "@/lib/ui/rodape-ocupado";

import { BuscarRapido } from "./BuscarRapido";
import { useCuentaBandeja } from "./DockElegancia";
import { ABAJO, MENU, estaActiva, type Destino } from "./destinos";
import { Icono } from "./Iconos";

export const BARRA_ELEGANCIA: PecaDoRodape = {
  dono: "components/shell/elegancia/BarraInferiorElegancia.tsx",
  distancia: 0,
  altura: 0,
};

const EN_BARRA = ["resumen", "embudo", "bandeja", "contactos"];

export function BarraInferiorElegancia() {
  const ruta = usePathname() ?? "";
  const cuenta = useCuentaBandeja();
  const ancora = usePecaDoRodape(BARRA_ELEGANCIA);
  const { resolvedTheme, setTheme } = useTheme();
  const oscuro = resolvedTheme === "dark";
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);

  const enBarra = MENU.filter((d) => EN_BARRA.includes(d.clave));
  const enMas: Destino[] = [...MENU.filter((d) => !EN_BARRA.includes(d.clave)), ...ABAJO];
  const masActivo = enMas.some((d) => estaActiva(d, ruta));

  return (
    <nav ref={ancora} className="eleg-barra md:hidden" style={{ bottom: BARRA_ELEGANCIA.distancia }} aria-label="Menú">
      <ul>
        {enBarra.map((d) => (
          <li key={d.clave}>
            <Link href={d.href} className={`eleg-barra-item ${estaActiva(d, ruta) ? "on" : ""}`}>
              <span className="eleg-barra-ico">
                <Icono nombre={d.icono} />
                {d.bandeja && cuenta > 0 && <span className="eleg-barra-ct">{cuenta > 99 ? "99+" : cuenta}</span>}
              </span>
              <span className="eleg-barra-lb">{d.nombre}</span>
            </Link>
          </li>
        ))}
        <li>
          <Sheet
            open={abierto}
            onOpenChange={(v) => {
              setAbierto(v);
              if (!v) setBuscando(false);
            }}
          >
            <SheetTrigger asChild>
              <button type="button" className={`eleg-barra-item ${masActivo ? "on" : ""}`}>
                <span className="eleg-barra-ico">
                  <svg className="eleg-i" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="5" cy="12" r="1.8" />
                    <circle cx="12" cy="12" r="1.8" />
                    <circle cx="19" cy="12" r="1.8" />
                  </svg>
                </span>
                <span className="eleg-barra-lb">Más</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="eleg-mas">
              <SheetTitle className="eleg-mas-titulo">{buscando ? "Buscar" : "Más"}</SheetTitle>
              {buscando ? (
                <BuscarRapido
                  onCerrar={() => {
                    setAbierto(false);
                    setBuscando(false);
                  }}
                />
              ) : (
              <div className="eleg-mas-grid">
                {enMas.map((d) => (
                  <Link
                    key={d.clave}
                    href={d.href}
                    onClick={() => setAbierto(false)}
                    className={`eleg-mas-item ${estaActiva(d, ruta) ? "on" : ""}`}
                  >
                    <span className="eleg-mas-ico">
                      <Icono nombre={d.icono} />
                    </span>
                    {d.nombre}
                  </Link>
                ))}
                <button type="button" className="eleg-mas-item" onClick={() => setTheme(oscuro ? "light" : "dark")}>
                  <span className="eleg-mas-ico">
                    <Icono nombre={oscuro ? "sun" : "moon"} />
                  </span>
                  {oscuro ? "Tema claro" : "Tema oscuro"}
                </button>
                <button type="button" className="eleg-mas-item" onClick={() => setBuscando(true)}>
                  <span className="eleg-mas-ico">
                    <Icono nombre="search" />
                  </span>
                  Buscar
                </button>
              </div>
              )}
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
}
