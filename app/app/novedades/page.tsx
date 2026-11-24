import type { Metadata } from "next";

import { LineaDeTiempo, type Novedad } from "@/components/elegancia/LineaDeTiempo";
import { requireAuth } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Novedades" };

/**
 * Novedades (Elegancia de Amor): el historial de todo lo que se cambia en el
 * CRM — funciones nuevas, mejoras, arreglos, diseño y datos — en una línea de
 * tiempo. Cada cambio en vivo agrega una fila a `elegancia_novedades` y la
 * pantalla se refresca sola.
 */
export default async function NovedadesPage() {
  await requireAuth();
  const supabase = await createClient();
  const { data } = await supabase
    .from("elegancia_novedades")
    .select("id, ocurrio_en, tipo, titulo, detalle, area, version, estado")
    .order("ocurrio_en", { ascending: false })
    .limit(500);

  return <LineaDeTiempo novedades={(data ?? []) as Novedad[]} />;
}
