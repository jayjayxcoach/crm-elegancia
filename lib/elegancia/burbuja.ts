/**
 * La burbuja del logo animada, compartida por las dos pantallas de entrada de
 * la app del celular (Elegancia de Amor):
 *
 * 1. la "ponte" que el servidor manda al abrir desde el ícono
 *    (`lib/auth/ponte-de-volta.ts`): la burbuja aparece con un rebote;
 * 2. la capa sobre el CRM mientras carga (`app/SplashDeEntrada.tsx`): la misma
 *    burbuja, en el mismo lugar, sigue flotando y parpadeando hasta que la
 *    página terminó de cargar, y se desvanece.
 *
 * Mismo dibujo y mismos números en las dos, para que el paso de una a la otra
 * no se note. Texto plano (no JSX) para poder ir dentro de un HTML a mano.
 */

export const FONDO_DE_ENTRADA = "#0f0d24";

const CUERPO =
  "M196 120 H316 A76 76 0 0 1 392 196 V296 A76 76 0 0 1 377.2 341.1 L390 426 L327.8 371.1 A76 76 0 0 1 316 372 H196 A76 76 0 0 1 120 296 V196 A76 76 0 0 1 196 120 Z";

export const BURBUJA_SVG = `<div class="eb-pop"><svg class="eb-burbuja" viewBox="96 100 320 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="ebBody" gradientUnits="userSpaceOnUse" x1="110" y1="100" x2="400" y2="420"><stop offset="0" stop-color="#F6C8FF"/><stop offset="0.45" stop-color="#B7AEFF"/><stop offset="1" stop-color="#6FB8FF"/></linearGradient><linearGradient id="ebShade" gradientUnits="userSpaceOnUse" x1="0" y1="250" x2="0" y2="430"><stop offset="0" stop-color="#2B1F7A" stop-opacity="0"/><stop offset="1" stop-color="#2B1F7A" stop-opacity="0.55"/></linearGradient><linearGradient id="ebGloss" gradientUnits="userSpaceOnUse" x1="0" y1="95" x2="0" y2="235"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient></defs><path d="${CUERPO}" fill="url(#ebBody)"/><path d="${CUERPO}" fill="url(#ebShade)"/><path d="${CUERPO}" fill="url(#ebGloss)"/><rect x="120" y="120" width="272" height="252" rx="76" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="3"/><path d="M377.2 341.1 L390 426 L327.8 371.1" fill="none" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="3" stroke-linejoin="round"/><g class="eb-ojo"><ellipse cx="212" cy="240" rx="28" ry="42" fill="#120F2C"/><ellipse cx="203" cy="223" rx="9" ry="13" fill="#FFFFFF"/><circle cx="221" cy="258" r="4.5" fill="#FFFFFF" opacity="0.85"/></g><g class="eb-ojo"><ellipse cx="300" cy="240" rx="28" ry="42" fill="#120F2C"/><ellipse cx="291" cy="223" rx="9" ry="13" fill="#FFFFFF"/><circle cx="309" cy="258" r="4.5" fill="#FFFFFF" opacity="0.85"/></g><ellipse cx="168" cy="296" rx="17" ry="8" fill="#FF8A7A" opacity="0.55"/><ellipse cx="344" cy="296" rx="17" ry="8" fill="#FF8A7A" opacity="0.55"/></svg></div>`;

/**
 * CSS de la escena (fondo, brillo, burbuja flotando y parpadeando sin parar).
 * `caja` es el selector del contenedor. Con `entrada` la burbuja aparece con un
 * rebote (solo la primera pantalla); sin ella arranca ya en su sitio.
 */
export function cssDeLaBurbuja(caja: string, entrada: boolean): string {
  const pop = entrada ? "eb-entra .6s cubic-bezier(.34,1.56,.64,1) both," : "";
  const brilloIni = entrada ? "eb-brillo-entra .9s ease-out both," : "";
  return `
${caja}{display:grid;place-items:center;position:fixed;inset:0;background:${FONDO_DE_ENTRADA};overflow:hidden}
${caja} .eb-brillo{position:absolute;inset:0;margin:auto;width:300px;height:300px;border-radius:50%;
  background:radial-gradient(closest-side,#b9a8ff59,#b9a8ff00);animation:${brilloIni}eb-latido 2.4s ease-in-out infinite}
${caja} .eb-pop{position:relative;width:min(170px,42vw);${pop ? `animation:${pop.replace(/,$/, "")}` : ""}}
${caja} .eb-burbuja{display:block;width:min(170px,42vw);height:auto;overflow:visible;animation:eb-flota 1.8s ease-in-out infinite}
${caja} .eb-ojo{transform-box:fill-box;transform-origin:center;animation:eb-parpadeo 3s ease-in-out .5s infinite}
@keyframes eb-entra{0%{transform:none}35%{transform:scale(1.06,.92)}65%{transform:scale(.97,1.04)}100%{transform:none}}
@keyframes eb-flota{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-7px) rotate(-3deg)}60%{transform:translateY(0) rotate(2deg)}}
@keyframes eb-parpadeo{0%,14%,100%{transform:scaleY(1)}7%{transform:scaleY(.12)}}
@keyframes eb-latido{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
@keyframes eb-brillo-entra{0%{opacity:0;transform:scale(.6)}100%{opacity:.75;transform:scale(1)}}
@media (prefers-reduced-motion: reduce){${caja} *{animation:none!important}}
`;
}
