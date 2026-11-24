import type { MetadataRoute } from "next";

import { marcaDaSaida } from "@/lib/branding/saida";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaDoVisitante } from "@/lib/i18n/idiomaAnonimo";

// A imagem distribuída é construída sem a marca da instalação. Uma função
// async, sozinha, ainda pode ser prerenderizada com o nome de fallback do build.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const marca = await marcaDaSaida(null);
  // A instalação não tem idioma próprio: o do aparelho que pede (Accept-Language).
  const idioma = await idiomaDoVisitante(null);
  return {
    // Igual ao start_url de sempre: quem já instalou mantém o mesmo app.
    id: "/app",
    name: marca.nome,
    short_name: marca.nome,
    description: traduzir("Atendimento e vendas pelo WhatsApp, também no celular.", idioma),
    display: "standalone",
    start_url: "/app",
    scope: "/",
    // Elegancia de Amor: pantalla de arranque oscura, del mismo azul noche del logo,
    // para que la burbuja quede flotando (sin el cuadrado) y empalme con la
    // animación de entrada (`app/SplashDeEntrada.tsx`).
    background_color: "#0f0d24",
    theme_color: "#0f0d24",
    icons: [
      // Elegancia de Amor: el logo propio vive en `public/brand/`.
      // "any" sin fondo: es la que Android pone en la pantalla de arranque.
      { src: "/brand/icon-any-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-any-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Con su fondo azul noche: el ícono de la pantalla de inicio del celular.
      { src: "/brand/icon-192.png?v=2", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/brand/icon-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
