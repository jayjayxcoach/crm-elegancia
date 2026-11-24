/**
 * Pantalla de entrada animada (Elegancia de Amor).
 *
 * Al abrir la app instalada desde el ícono, el servidor manda primero una
 * "ponte" (`lib/auth/ponte-de-volta.ts`) con la burbuja apareciendo sobre el
 * fondo azul noche. Esta capa la continúa sobre el CRM: la misma burbuja, en el
 * mismo lugar, sigue flotando y parpadeando MIENTRAS la página carga, y se
 * desvanece cuando terminó de cargar (evento `load`). Así la animación dura todo
 * lo que dura entrar.
 *
 * - Solo en la app instalada (`display-mode: standalone`); en el navegador no sale.
 * - Una vez por sesión: al navegar dentro de la app no se repite (sessionStorage,
 *   leído en el `<head>` antes de pintar, así no parpadea).
 * - El fin lo marca un atributo en `<html>` (que ya tolera diferencias de
 *   hidratación); React hidrata el mismo nodo que el servidor mandó.
 */
import { BURBUJA_SVG, cssDeLaBurbuja } from "@/lib/elegancia/burbuja";

export const SPLASH_INIT_SCRIPT = `(function(){var h=document.documentElement;try{if(sessionStorage.getItem('eleg-splash')){h.setAttribute('data-splash-visto','');return;}sessionStorage.setItem('eleg-splash','1');}catch(e){}var t0=Date.now();var listo=function(){h.setAttribute('data-splash-listo','');};var alCargar=function(){setTimeout(listo,Math.max(0,500-(Date.now()-t0)));};if(document.readyState==='complete'){alCargar();}else{window.addEventListener('load',alCargar);}setTimeout(listo,15000);})();`;

const CSS = `${cssDeLaBurbuja("#eleg-splash", false)}
#eleg-splash{display:none;z-index:2147483646}
@media (display-mode: standalone){#eleg-splash{display:grid}}
html[data-splash-visto] #eleg-splash{display:none!important}
html[data-splash-listo] #eleg-splash{animation:eleg-splash-fuera .45s cubic-bezier(.4,0,.2,1) forwards}
@keyframes eleg-splash-fuera{to{opacity:0;visibility:hidden;pointer-events:none}}
`;

export function SplashDeEntrada() {
  return (
    <div id="eleg-splash" aria-hidden="true" suppressHydrationWarning>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="eb-brillo" />
      <div dangerouslySetInnerHTML={{ __html: BURBUJA_SVG }} />
    </div>
  );
}
