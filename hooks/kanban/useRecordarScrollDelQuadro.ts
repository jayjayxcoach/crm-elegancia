"use client";

/**
 * Al abrir un pedido y volver atrás, el embudo vuelve al MISMO lugar (columna y
 * altura), no al principio. Guarda el desplazamiento del quadro y de la página
 * en sessionStorage y lo devuelve cuando las tarjetas ya están dibujadas.
 */
import { useEffect, type RefObject } from "react";

interface Posicion {
  x: number;
  y: number;
  pagina: number;
}

function leer(clave: string): Posicion | null {
  try {
    const v = sessionStorage.getItem(clave);
    return v ? (JSON.parse(v) as Posicion) : null;
  } catch {
    return null;
  }
}

export function useRecordarScrollDelQuadro(clave: string, ref: RefObject<HTMLElement | null>, listo: boolean): void {
  // Restaurar una sola vez, cuando ya hay tarjetas.
  useEffect(() => {
    if (!listo) return;
    const quadro = ref.current;
    if (!quadro) return;
    const pos = leer(clave);
    if (!pos) return;
    const pagina = quadro.closest("main");
    let intentos = 0;
    const aplicar = () => {
      quadro.scrollLeft = pos.x;
      quadro.scrollTop = pos.y;
      if (pagina) pagina.scrollTop = pos.pagina;
      intentos += 1;
      const llego = Math.abs(quadro.scrollLeft - pos.x) < 4 && Math.abs(quadro.scrollTop - pos.y) < 4;
      if (!llego && intentos < 20) requestAnimationFrame(aplicar);
    };
    requestAnimationFrame(aplicar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, clave]);

  // Guardar mientras se desplaza.
  useEffect(() => {
    const quadro = ref.current;
    if (!quadro) return;
    const pagina = quadro.closest("main");
    let pendiente = 0;
    const guardar = () => {
      cancelAnimationFrame(pendiente);
      pendiente = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(
            clave,
            JSON.stringify({ x: quadro.scrollLeft, y: quadro.scrollTop, pagina: pagina?.scrollTop ?? 0 }),
          );
        } catch {
          /* sin almacenamiento */
        }
      });
    };
    quadro.addEventListener("scroll", guardar, { passive: true });
    pagina?.addEventListener("scroll", guardar, { passive: true });
    return () => {
      cancelAnimationFrame(pendiente);
      quadro.removeEventListener("scroll", guardar);
      pagina?.removeEventListener("scroll", guardar);
    };
  }, [clave, ref, listo]);
}
