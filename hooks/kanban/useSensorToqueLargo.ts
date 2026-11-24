"use client";

/**
 * Arrastre de tarjetas en pantallas táctiles SOLO con toque largo.
 *
 * El sensor táctil de fábrica levanta la tarjeta a los 120 ms: con el pulgar
 * apoyado para bajar por el embudo, las tarjetas se movían sin querer. Este
 * sensor espera ~450 ms con el dedo quieto (si el dedo se desliza antes, es un
 * desplazamiento normal y no pasa nada). Al levantar la tarjeta vibra un poco.
 */
import { useEffect } from "react";
import type { FluidDragActions, PreDragActions, SensorAPI } from "@hello-pangea/dnd";

const ESPERA_MS = 450;
const TOLERANCIA_PX = 10;

export function useSensorToqueLargo(api: SensorAPI): void {
  useEffect(() => {
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    let inicio = { x: 0, y: 0 };
    let previo: PreDragActions | null = null;
    let arrastre: FluidDragActions | null = null;

    const limpiar = () => {
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
      previo = null;
      arrastre = null;
    };

    const alTocar = (e: TouchEvent) => {
      if (e.touches.length !== 1 || arrastre) return;
      const id = api.findClosestDraggableId(e);
      if (!id || !api.canGetLock(id)) return;
      const t = e.touches[0]!;
      inicio = { x: t.clientX, y: t.clientY };
      temporizador = setTimeout(() => {
        temporizador = null;
        previo = api.tryGetLock(id, limpiar, { sourceEvent: e });
        if (!previo) return;
        arrastre = previo.fluidLift(inicio);
        try {
          navigator.vibrate?.(25);
        } catch {
          /* sin vibración */
        }
      }, ESPERA_MS);
    };

    const alMover = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (arrastre) {
        e.preventDefault();
        arrastre.move({ x: t.clientX, y: t.clientY });
        return;
      }
      if (temporizador && Math.hypot(t.clientX - inicio.x, t.clientY - inicio.y) > TOLERANCIA_PX) {
        clearTimeout(temporizador);
        temporizador = null;
      }
    };

    const alSoltar = (e: TouchEvent) => {
      if (arrastre) {
        e.preventDefault();
        arrastre.drop();
      } else if (previo?.isActive()) {
        previo.abort();
      }
      limpiar();
    };

    const alCancelar = () => {
      if (arrastre) arrastre.cancel();
      else if (previo?.isActive()) previo.abort();
      limpiar();
    };

    // El menú de "mantener presionado" del navegador no debe salir encima.
    const alMenu = (e: Event) => {
      if (temporizador || arrastre) e.preventDefault();
    };

    window.addEventListener("touchstart", alTocar, { passive: true });
    window.addEventListener("touchmove", alMover, { passive: false });
    window.addEventListener("touchend", alSoltar, { passive: false });
    window.addEventListener("touchcancel", alCancelar);
    window.addEventListener("contextmenu", alMenu);
    return () => {
      limpiar();
      window.removeEventListener("touchstart", alTocar);
      window.removeEventListener("touchmove", alMover);
      window.removeEventListener("touchend", alSoltar);
      window.removeEventListener("touchcancel", alCancelar);
      window.removeEventListener("contextmenu", alMenu);
    };
  }, [api]);
}
