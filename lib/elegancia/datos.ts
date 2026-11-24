/**
 * Datos de las pantallas Resumen y Finanzas (Elegancia de Amor).
 *
 * Todo se lee del lado del servidor y siempre filtrado por la organización
 * activa. Lo que usa el cliente de servicio (gasto de IA, credencial de Meta)
 * filtra `organization_id` a mano, con el id resuelto de la sesión.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { lerCredencialDeLeitura } from "@/lib/plataformas-de-anuncio/credenciais-de-leitura";
import { lerInsights, listarContas, montarUrl } from "@/lib/plataformas-de-anuncio/meta/insights";

export interface MesDeGasto {
  /** AAAA-MM */
  mes: string;
  centavos: number;
  llamadas: number;
}

export type GastoDeFacebook =
  | { estado: "sin_conexion" }
  | { estado: "error"; detalle: string }
  | { estado: "ok"; moneda: string; meses: MesDeGasto[] };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function nombreDelMes(aaaamm: string): string {
  const [a, m] = aaaamm.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1]} ${a}`;
}

/** Los últimos `n` meses (AAAA-MM), del más antiguo al actual. */
export function ultimosMeses(n: number, hoy = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

function finDelMes(aaaamm: string): string {
  const [a, m] = aaaamm.split("-").map(Number);
  const d = new Date(Date.UTC(a!, m!, 0));
  const hoy = new Date();
  return (d > hoy ? hoy : d).toISOString().slice(0, 10);
}

/** Gasto de IA del CRM por mes, desde `llm_calls` (solo lo que tiene precio conocido suma). */
export async function gastoDeIa(admin: SupabaseClient, orgId: string, meses: string[]): Promise<MesDeGasto[]> {
  const desde = `${meses[0]}-01T00:00:00Z`;
  // El servidor devuelve como máximo 1000 filas por consulta: se lee por páginas.
  const filas: Array<{ cost_cents: number | null; created_at: string }> = [];
  for (let desdeFila = 0; desdeFila < 200000; desdeFila += 1000) {
    const { data } = await admin
      .from("llm_calls")
      .select("cost_cents, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", desde)
      .order("created_at")
      .range(desdeFila, desdeFila + 999);
    const pagina = (data ?? []) as typeof filas;
    filas.push(...pagina);
    if (pagina.length < 1000) break;
  }
  const porMes = new Map(meses.map((m) => [m, { mes: m, centavos: 0, llamadas: 0 }]));
  for (const fila of filas) {
    const m = porMes.get(fila.created_at.slice(0, 7));
    if (!m) continue;
    m.llamadas += 1;
    m.centavos += Number(fila.cost_cents ?? 0);
  }
  return [...porMes.values()];
}

/** Gasto en Meta Ads (Facebook/Instagram) por mes, leído en vivo de la cuenta conectada. */
export async function gastoDeFacebook(admin: SupabaseClient, orgId: string, meses: string[]): Promise<GastoDeFacebook> {
  const credencial = await lerCredencialDeLeitura(admin, orgId, "meta_ads");
  if (!credencial.ok) return { estado: "sin_conexion" };
  const token = credencial.credencial.accessToken;
  try {
    const contas = await listarContas(token);
    if (!contas.ok) return { estado: "error", detalle: String(contas.detalhe ?? contas.falha) };
    const moeda = contas.dados[0]?.moeda ?? "USD";
    const resultado: MesDeGasto[] = [];
    for (const mes of meses) {
      let centavos = 0;
      for (const conta of contas.dados) {
        const ins = await lerInsights(token, conta.id, `${mes}-01`, finDelMes(mes));
        if (!ins.ok) continue;
        for (const linha of ins.dados) centavos += Math.round(Number(linha.spend ?? 0) * 100);
      }
      resultado.push({ mes, centavos, llamadas: 0 });
    }
    return { estado: "ok", moneda: moeda, meses: resultado };
  } catch (e) {
    return { estado: "error", detalle: e instanceof Error ? e.message : "lectura falló" };
  }
}

/** Dinero con su moneda, en español: $49, S/ 100, $ 227.000 COP. */
export function dinero(centavos: number, moneda = "USD", decimales = 0): string {
  try {
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: moneda,
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales,
    }).format(centavos / 100);
  } catch {
    return `${(centavos / 100).toFixed(decimales)} ${moneda}`;
  }
}

/**
 * Elegancia cobra todo en dólares (Payphone). Cuando un pedido quedó anotado en
 * otra moneda (precio que se le dijo a la clienta en su país), se pasa a dólares
 * con una tasa aproximada para que los totales salgan en una sola moneda.
 */
const TASAS_A_USD: Record<string, number> = { USD: 1, COP: 4000, PEN: 3.75, MXN: 18, ARS: 1000, CLP: 950, EUR: 0.92, BRL: 5.5 };

export function aDolares(centavos: number | null, moneda: string | null): number {
  if (!centavos) return 0;
  const tasa = TASAS_A_USD[(moneda ?? "USD").toUpperCase()] ?? 1;
  return Math.round(centavos / tasa);
}

/** Total en dólares de una lista de pedidos. */
export function sumaPorMoneda(filas: Array<{ value_cents: number | null; currency: string | null }>): string {
  return dinero(filas.reduce((a, f) => a + aDolares(f.value_cents, f.currency), 0));
}

export const EVENTOS_ORDEN: ReadonlyArray<{ tag: string; nombre: string; color: string }> = [
  { tag: "xv", nombre: "Quinceañera", color: "#e05d8c" },
  { tag: "boda", nombre: "Boda", color: "#7d6ee6" },
  { tag: "bautizo", nombre: "Bautizo", color: "#3d8fdb" },
  { tag: "primera-comunion", nombre: "Primera comunión", color: "#c99a13" },
];

export function eventoDe(tags: string[] | null): string {
  const t = new Set((tags ?? []).map((x) => x.toLowerCase()));
  return EVENTOS_ORDEN.find((e) => t.has(e.tag))?.tag ?? "otro";
}

/**
 * Gasto diario en Meta Ads (todas las cuentas), en centavos por día AAAA-MM-DD.
 * `null` si no hay conexión; `{}` si la lectura falló.
 */
export async function gastoDiarioDeFacebook(
  admin: SupabaseClient,
  orgId: string,
  desde: string,
  hasta: string,
): Promise<Record<string, number> | null> {
  const credencial = await lerCredencialDeLeitura(admin, orgId, "meta_ads");
  if (!credencial.ok) return null;
  const token = credencial.credencial.accessToken;
  const porDia: Record<string, number> = {};
  try {
    const contas = await listarContas(token);
    if (!contas.ok) return porDia;
    for (const conta of contas.dados) {
      let url: string | null = montarUrl(`${encodeURIComponent(conta.id)}/insights`, {
        level: "account",
        time_increment: "1",
        time_range: JSON.stringify({ since: desde, until: hasta }),
        fields: "spend",
        limit: "100",
      });
      for (let pagina = 0; url && pagina < 10; pagina++) {
        const r: Response = await fetch(url, {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
        if (!r.ok) break;
        const j = (await r.json()) as { data?: Array<{ spend?: string; date_start?: string }>; paging?: { next?: string } };
        for (const fila of j.data ?? []) {
          if (!fila.date_start) continue;
          porDia[fila.date_start] = (porDia[fila.date_start] ?? 0) + Math.round(Number(fila.spend ?? 0) * 100);
        }
        url = j.paging?.next ?? null;
      }
    }
  } catch {
    return porDia;
  }
  return porDia;
}
