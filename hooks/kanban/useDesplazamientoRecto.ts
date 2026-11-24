"use client";

/**
 * El embudo se desplaza en LÍNEA RECTA con el dedo: o de lado (columnas) o de
 * arriba abajo (tarjetas), nunca en diagonal (Elegancia de Amor).
 *
 * El quadro rola en los dos ejes a la vez, y en el celular el dedo nunca va
 * perfectamente recto: el embudo se iba de lado mientras uno bajaba. Al empezar
 * cada gesto se mira hacia dónde va el dedo y se apaga el otro eje
 * (`overflow-x|y: hidden`, que no mueve la posición) hasta que el desplazamiento
 * —con su inercia— termina. Solo con el dedo: el ratón y el teclado no cambian.
 *
 * Si el dedo se queda quieto el tiempo del toque largo, es un arrastre de
 * tarjeta (`useSensorToqueLargo`), y ahí no se bloquea nada.
 *
 * EN IPHONE/IPAD NO SE BLOQUEA NADA. En Safari de iOS (y todo navegador de
 * iOS, que usa el mismo motor) cambiar `overflow-x` a `hidden` mientras el dedo
 * baja devuelve el quadro a la PRIMERA columna (scrollLeft = 0) y corta el
 * gesto: se pasaba a "Enviado", se bajaba, y saltaba a "Prospecto". Allí se
 * deja el desplazamiento nativo de Apple. Y por seguridad, en los demás, si al
 * bloquear la posición cambia, se devuelve a donde estaba.
 */
import { useEffect, type RefObject } from "react";

const UMBRAL_PX = 8;
/** Un poco menos que la espera del toque largo (450 ms). */
const ES_ARRASTRE_MS = 400;
const FIN_SIN_SCROLLEND_MS = 180;

function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad con iPadOS se presenta como Mac de escritorio.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** `listo`: el quadro ya está en pantalla (mientras carga se ve otro bloque). */
export function useDesplazamientoRecto(ref: RefObject<HTMLElement | null>, listo: boolean): void {
  useEffect(() => {
    const quadro = ref.current;
    if (!quadro || esIOS()) return;

    let inicio: { x: number; y: number; t: number } | null = null;
    let bloqueado = false;
    let tocando = false;
    let espera: ReturnType<typeof setTimeout> | null = null;
    const tieneScrollend = "onscrollend" in window;

    const liberar = () => {
      if (espera) clearTimeout(espera);
      espera = null;
      if (!bloqueado) return;
      bloqueado = false;
      quadro.style.overflowX = "";
      quadro.style.overflowY = "";
    };

    const alTocar = (e: TouchEvent) => {
      tocando = true;
      if (e.touches.length !== 1) {
        inicio = null;
        return;
      }
      liberar();
      const t = e.touches[0]!;
      inicio = { x: t.clientX, y: t.clientY, t: Date.now() };
    };

    const alMover = (e: TouchEvent) => {
      if (!inicio || bloqueado) return;
      const t = e.touches[0];
      if (!t) return;
      const dx = Math.abs(t.clientX - inicio.x);
      const dy = Math.abs(t.clientY - inicio.y);
      if (Math.max(dx, dy) < UMBRAL_PX) return;
      const esArrastre = Date.now() - inicio.t >= ES_ARRASTRE_MS;
      inicio = null;
      if (esArrastre) return;
      bloqueado = true;
      const x = quadro.scrollLeft;
      const y = quadro.scrollTop;
      if (dx > dy) quadro.style.overflowY = "hidden";
      else quadro.style.overflowX = "hidden";
      // Si el navegador movió el quadro al cambiar `overflow`, se devuelve.
      if (quadro.scrollLeft !== x) quadro.scrollLeft = x;
      if (quadro.scrollTop !== y) quadro.scrollTop = y;
    };

    // Al soltar el dedo sigue la inercia: se libera cuando el scroll termina.
    const alSoltar = () => {
      tocando = false;
      inicio = null;
      if (!bloqueado) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(liberar, tieneScrollend ? 1200 : FIN_SIN_SCROLLEND_MS);
    };

    const alDesplazar = () => {
      if (!bloqueado || tocando) return;
      if (espera) clearTimeout(espera);
      espera = setTimeout(liberar, tieneScrollend ? 400 : FIN_SIN_SCROLLEND_MS);
    };

    const alTerminarScroll = () => {
      if (!tocando) liberar();
    };

    quadro.addEventListener("touchstart", alTocar, { passive: true });
    quadro.addEventListener("touchmove", alMover, { passive: true });
    quadro.addEventListener("touchend", alSoltar, { passive: true });
    quadro.addEventListener("touchcancel", alSoltar, { passive: true });
    quadro.addEventListener("scroll", alDesplazar, { passive: true });
    quadro.addEventListener("scrollend", alTerminarScroll);
    return () => {
      liberar();
      quadro.removeEventListener("touchstart", alTocar);
      quadro.removeEventListener("touchmove", alMover);
      quadro.removeEventListener("touchend", alSoltar);
      quadro.removeEventListener("touchcancel", alSoltar);
      quadro.removeEventListener("scroll", alDesplazar);
      quadro.removeEventListener("scrollend", alTerminarScroll);
    };
  }, [ref, listo]);
}
