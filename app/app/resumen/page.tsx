import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { GraficoGasto } from "@/components/elegancia/GraficoGasto";
import { Card } from "@/components/ui/card";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import {
  EVENTOS_ORDEN,
  aDolares,
  dinero,
  eventoDe,
  gastoDeIa,
  gastoDiarioDeFacebook,
  sumaPorMoneda,
  ultimosMeses,
} from "@/lib/elegancia/datos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Resumen" };

interface Lead {
  id: string;
  title: string;
  status: string;
  value_cents: number | null;
  currency: string | null;
  stage_id: string;
  tags: string[] | null;
  expected_close_date: string | null;
  created_at: string;
  closed_at: string | null;
  last_activity_at: string | null;
  updated_at: string;
}
interface Etapa {
  id: string;
  name: string;
  position: number;
  color: string | null;
  is_won: boolean;
  is_lost: boolean;
}

/* Colores del prototipo: punto de cada etapa y fondo pastel de su tarjeta. */
const PUNTOS = ["#7d6ee6", "#3d8fdb", "#c99a13", "#6f9a16", "#e0623f", "#d24f84", "#2e9e8f", "#8e948f"];
const PASTELES = ["#c9c3f1", "#a8cdee", "#f0db8e", "#cfe58a", "#f2a891", "#efaac4", "#22272a", "#d9dcd6"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function fecha(d: string): string {
  const x = new Date(`${d.slice(0, 10)}T12:00:00Z`);
  return `${x.getUTCDate()} ${MESES[x.getUTCMonth()]}`;
}
function hace(iso: string | null): string {
  if (!iso) return "";
  const min = (Date.now() - new Date(iso).getTime()) / 60000;
  if (min < 60) return "hace un rato";
  const h = min / 60;
  if (h < 24) return `hace ${Math.round(h)} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
function iniciales(t: string): string {
  const w = t.replace(/[^\p{L}\s·]/gu, "").split(/[\s·]+/).filter(Boolean);
  return ((w[0] ?? "?").charAt(0) + (w[1] ?? "").charAt(0)).toUpperCase();
}

export default async function ResumenPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/app");
  const supabase = await createClient();

  const { data: funis } = await supabase
    .from("crm_pipelines")
    .select("id, name, is_default, position")
    .eq("organization_id", org.orgId)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("position")
    .limit(1);
  const funil = funis?.[0] as { id: string; name: string } | undefined;

  const [{ data: etapasCrudas }, { data: leadsCrudos }] = funil
    ? await Promise.all([
        supabase
          .from("crm_stages")
          .select("id, name, position, color, is_won, is_lost")
          .eq("organization_id", org.orgId)
          .eq("pipeline_id", funil.id)
          .eq("is_archived", false)
          .order("position"),
        supabase
          .from("crm_leads")
          .select("id, title, status, value_cents, currency, stage_id, tags, expected_close_date, created_at, closed_at, last_activity_at, updated_at")
          .eq("organization_id", org.orgId)
          .eq("pipeline_id", funil.id)
          .limit(5000),
      ])
    : [{ data: [] }, { data: [] }];

  const etapas = (etapasCrudas ?? []) as Etapa[];
  const leads = (leadsCrudos ?? []) as Lead[];
  const hoyIso = new Date().toISOString().slice(0, 10);
  const mes = hoyIso.slice(0, 7);
  const abiertos = leads.filter((l) => l.status === "open");
  const ganados = leads.filter((l) => l.status === "won");
  const ganadosMes = ganados.filter((l) => (l.closed_at ?? "").startsWith(mes));
  const nuevosMes = leads.filter((l) => l.created_at.startsWith(mes));
  const deAnuncio = nuevosMes.filter((l) => (l.tags ?? []).some((t) => t.toLowerCase() === "meta_ads")).length;

  const etapasAbiertas = etapas.filter((e) => !e.is_won && !e.is_lost);
  const porEtapa = etapasAbiertas.map((e, i) => {
    const ls = abiertos.filter((l) => l.stage_id === e.id);
    return {
      ...e,
      punto: e.color ?? PUNTOS[i % PUNTOS.length]!,
      pastel: PASTELES[i % PASTELES.length]!,
      oscura: i === 6,
      n: ls.length,
      valor: sumaPorMoneda(ls),
    };
  });
  const infoEtapa = new Map(porEtapa.map((e) => [e.id, e]));
  const totalAbiertos = Math.max(1, porEtapa.reduce((a, e) => a + e.n, 0));

  const posicion = new Map(etapasAbiertas.map((e, i) => [e.id, i]));
  const calientes = abiertos
    .filter((l) => (posicion.get(l.stage_id) ?? -1) >= Math.max(0, etapasAbiertas.length - 4))
    .sort(
      (a, b) =>
        (posicion.get(b.stage_id) ?? 0) - (posicion.get(a.stage_id) ?? 0) ||
        (b.last_activity_at ?? b.updated_at).localeCompare(a.last_activity_at ?? a.updated_at),
    )
    .slice(0, 6);
  const proximos = abiertos
    .filter((l) => l.expected_close_date && l.expected_close_date >= hoyIso)
    .sort((a, b) => (a.expected_close_date! > b.expected_close_date! ? 1 : -1))
    .slice(0, 5);
  const actividad = [...leads]
    .sort((a, b) => (b.last_activity_at ?? b.updated_at).localeCompare(a.last_activity_at ?? a.updated_at))
    .slice(0, 6);
  const eventos = [...EVENTOS_ORDEN, { tag: "otro", nombre: "Otros", color: "#8e948f" }].map((e) => ({
    ...e,
    n: abiertos.filter((l) => eventoDe(l.tags) === e.tag).length,
  }));
  const nombreEvento = (l: Lead) => EVENTOS_ORDEN.find((x) => x.tag === eventoDe(l.tags))?.nombre ?? "Otro";

  // Lo que entra y lo que sale (solo gerente o administrador)
  const verDinero = ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const desde = new Date(Date.now() - 41 * 864e5).toISOString().slice(0, 10);
  const admin = createAdminClient();
  const ia = verDinero ? await gastoDeIa(admin, org.orgId, ultimosMeses(1)) : [];
  const fbDiario = verDinero ? await gastoDiarioDeFacebook(admin, org.orgId, desde, hoyIso) : null;
  const vendido = ganadosMes.reduce((a, l) => a + aDolares(l.value_cents, l.currency), 0);
  const fbMes = Object.entries(fbDiario ?? {})
    .filter(([k]) => k.startsWith(mes))
    .reduce((a, [, v]) => a + v, 0);
  const iaMes = ia[0]?.centavos ?? 0;
  const queda = vendido - fbMes - iaMes;
  // Ventas cerradas por día (en dólares), para la etiqueta "Ganado" de la gráfica.
  const ventasPorDia: Record<string, number> = {};
  for (const l of ganados) {
    if (!l.closed_at) continue;
    const dia = new Date(new Date(l.closed_at).getTime() - 5 * 3600e3).toISOString().slice(0, 10); // hora de Ecuador
    ventasPorDia[dia] = (ventasPorDia[dia] ?? 0) + aDolares(l.value_cents, l.currency);
  }
  const enlace = (id: string) => (funil ? `/app/pipelines/${funil.id}?lead=${id}` : "/app/kanban");

  return (
    <div className="eleg-resumen flex flex-col gap-5 p-2 sm:p-4">
      <header className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <h1 className="max-w-[300px] text-[clamp(34px,3.4vw,52px)] font-semibold leading-[1.02] tracking-[-0.025em]">Resumen de ventas</h1>
        <Dato icono="trofeo" valor={dinero(vendido)} extra={`${ganadosMes.length} pago${ganadosMes.length === 1 ? "" : "s"}`} titulo="Vendido este mes" />
        <Dato icono="tendencia" valor={sumaPorMoneda(abiertos)} titulo={`En el embudo · ${abiertos.length} pedidos`} />
        <Dato icono="correo" valor={String(nuevosMes.length)} extra={`${deAnuncio} por anuncio`} extraCeleste titulo="Clientes nuevos este mes" />
      </header>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {verDinero && (
          <Card className="p-[18px] xl:col-span-7">
            <Titulo texto="Lo que entra y lo que sale" nota={MESES_LARGOS[Number(mes.slice(5, 7)) - 1]} enlace="/app/finanzas" />
            <div className="flex flex-wrap items-end gap-[clamp(18px,3vw,40px)]">
              <div>
                <div className="eleg-big">{dinero(vendido)}</div>
                <div className="mt-1.5 text-[13px] text-text-muted">vendido</div>
              </div>
              <div>
                <div className="eleg-big eleg-malo">−{dinero(fbMes + iaMes, "USD", 2)}</div>
                <div className="mt-1.5 text-[13px] text-text-muted">
                  Facebook {fbDiario === null ? "—" : dinero(fbMes, "USD", 2)} · IA {dinero(iaMes, "USD", 2)}
                </div>
              </div>
              <div>
                <div className={`eleg-big ${queda >= 0 ? "eleg-bueno" : "eleg-malo"}`}>{dinero(queda, "USD", 2)}</div>
                <div className="mt-1.5 text-[13px] text-text-muted">queda</div>
              </div>
            </div>
            {fbDiario === null ? (
              <p className="mt-6 text-sm text-text-muted">
                Conecta Meta Ads en{" "}
                <Link href="/app/settings/meta-ads" className="underline underline-offset-4">Configuración › Meta Ads</Link> para ver el gasto diario.
              </p>
            ) : (
              <GraficoGasto
                dias={Array.from({ length: 42 }, (_, i) => {
                  const k = new Date(new Date(`${desde}T12:00:00Z`).getTime() + i * 864e5).toISOString().slice(0, 10);
                  return [k, (fbDiario[k] ?? 0) / 100, (ventasPorDia[k] ?? 0) / 100] as [string, number, number];
                })}
              />
            )}
          </Card>
        )}

        <Card className={`p-[18px] ${verDinero ? "xl:col-span-5" : "xl:col-span-12"}`}>
          <Titulo texto="Pedidos calientes" nota="más cerca de pagar" />
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {calientes.length === 0 && <p className="text-sm text-text-muted">Nada por ahora.</p>}
            {calientes.map((l) => {
              const e = infoEtapa.get(l.stage_id);
              return (
                <Link
                  key={l.id}
                  href={enlace(l.id)}
                  className={`eleg-tile ${e?.oscura ? "ink" : ""}`}
                  style={{ ["--bgc" as string]: e?.pastel, ["--punto" as string]: e?.punto }}
                >
                  <div className="d">{l.expected_close_date ? `Evento ${fecha(l.expected_close_date)}` : "Sin fecha"}</div>
                  <div className="n">{l.title}</div>
                  <div className="d">{e?.name}</div>
                  <div className="v">
                    {l.value_cents ? dinero(aDolares(l.value_cents, l.currency)) : "—"}
                    <span>{nombreEvento(l)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>

        <Card className="p-[18px] xl:col-span-4">
          <Titulo texto="Por tipo de evento" nota="pedidos abiertos" />
          <Dona eventos={eventos} />
        </Card>

        <Card className="p-[18px] xl:col-span-8">
          <Titulo texto="Cómo está el embudo" enlace={funil ? `/app/pipelines/${funil.id}` : undefined} />
          <div className="flex items-baseline gap-2.5">
            <span className="eleg-big" style={{ fontSize: 34 }}>{sumaPorMoneda(abiertos)}</span>
            <span className="text-[13px] text-text-muted">en {abiertos.length} pedidos abiertos</span>
          </div>
          <div className="mb-1.5 mt-4 flex h-3 gap-[3px] overflow-hidden rounded-full">
            {porEtapa
              .filter((e) => e.n > 0)
              .map((e) => (
                <i key={e.id} title={`${e.name}: ${e.n}`} style={{ flex: e.n, background: e.punto }} className="block rounded-full" />
              ))}
          </div>
          <table className="w-full text-[13.5px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[.06em] text-text-subtle">
                <th className="px-2.5 py-2 font-bold">Etapa</th>
                <th className="px-2.5 py-2 text-right font-bold">Pedidos</th>
                <th className="px-2.5 py-2 text-right font-bold">Valor</th>
                <th className="px-2.5 py-2 text-right font-bold">%</th>
              </tr>
            </thead>
            <tbody>
              {porEtapa.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-2.5 py-[11px]">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-[9px] w-[9px] rounded-full" style={{ background: e.punto }} />
                      {e.name}
                    </span>
                  </td>
                  <td className="px-2.5 py-[11px] text-right font-semibold">{e.n}</td>
                  <td className="px-2.5 py-[11px] text-right font-semibold">{e.valor}</td>
                  <td className="px-2.5 py-[11px] text-right">{Math.round((e.n / totalAbiertos) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-[18px] xl:col-span-6">
          <Titulo texto="Próximos eventos" nota="fecha de la fiesta" />
          <Filas
            vacio="Nada próximo"
            filas={proximos.map((l) => ({
              id: l.id,
              href: enlace(l.id),
              izquierda: <span className="eleg-chip">{fecha(l.expected_close_date!)}</span>,
              titulo: l.title,
              sub: `${infoEtapa.get(l.stage_id)?.name ?? ""} · ${nombreEvento(l)}`,
              derecha: l.value_cents ? dinero(aDolares(l.value_cents, l.currency)) : "",
              fuerte: true,
            }))}
          />
        </Card>

        <Card className="p-[18px] xl:col-span-6">
          <Titulo texto="Actividad reciente" />
          <Filas
            vacio="Sin actividad."
            filas={actividad.map((l) => ({
              id: l.id,
              href: enlace(l.id),
              izquierda: (
                <span className="eleg-av" style={{ background: EVENTOS_ORDEN.find((x) => x.tag === eventoDe(l.tags))?.color ?? "#8e948f" }}>
                  {iniciales(l.title)}
                </span>
              ),
              titulo: l.title,
              sub: l.status === "won" ? "Pagó · Venta cerrada" : l.status === "lost" ? "No compró" : `Está en ${infoEtapa.get(l.stage_id)?.name ?? ""}`,
              derecha: hace(l.last_activity_at ?? l.updated_at),
              fuerte: false,
            }))}
          />
        </Card>
      </div>
    </div>
  );
}

/* ── Dona del prototipo: pedidos abiertos por tipo de evento ── */
function Dona({ eventos }: { eventos: Array<{ tag: string; nombre: string; color: string; n: number }> }) {
  const tot = eventos.reduce((a, e) => a + e.n, 0) || 1;
  const R = 66;
  const C = 2 * Math.PI * R;
  const xv = eventos.find((e) => e.tag === "xv")?.n ?? 0;
  let a = 0;
  const arcos = eventos
    .filter((e) => e.n)
    .map((e) => {
      const l = (e.n / tot) * C;
      const desde = a;
      a += l;
      return { e, l, desde };
    });
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={170} height={170} viewBox="0 0 170 170" className="eleg-dona">
        <circle r={R} cx={85} cy={85} fill="none" className="eleg-dona-fondo" strokeWidth={16} />
        {arcos.map(({ e, l, desde }) => (
          <circle
            key={e.tag}
            r={R}
            cx={85}
            cy={85}
            fill="none"
            stroke={e.color}
            strokeWidth={16}
            strokeDasharray={`${Math.max(l - 4, 1)} ${C}`}
            strokeDashoffset={-desde}
            transform="rotate(-90 85 85)"
            strokeLinecap="round"
          />
        ))}
        <text x={85} y={84} textAnchor="middle" className="eleg-dona-pct">
          {Math.round((xv / tot) * 100)}%
        </text>
        <text x={85} y={104} textAnchor="middle">
          son XV años
        </text>
      </svg>
      <div className="min-w-[150px] flex-1">
        {eventos.map((e, i) => (
          <div key={e.tag} className={`flex items-center py-[7px] ${i ? "border-t border-border" : ""}`}>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold">
              <span className="h-[7px] w-[7px] rounded-full" style={{ background: e.color }} />
              {e.nombre}
            </span>
            <span className="ml-auto font-semibold">{e.n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const ICONOS_DATO: Record<string, ReactNode> = {
  trofeo: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z" />
    </>
  ),
  tendencia: (
    <>
      <path d="m22 7-8.5 8.5-5-5L2 17" />
      <path d="M16 7h6v6" />
    </>
  ),
  correo: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2.5" />
      <path d="m22 7-10 6L2 7" />
    </>
  ),
};

function Dato({ icono, valor, extra, extraCeleste, titulo }: { icono: string; valor: string; extra?: string; extraCeleste?: boolean; titulo: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="eleg-si">
        <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          {ICONOS_DATO[icono]}
        </svg>
      </div>
      <div>
        <div className="flex items-center gap-2.5 text-[21px] font-semibold tracking-[-0.01em]">
          {valor}
          {extra && <span className={`eleg-badge ${extraCeleste ? "celeste" : ""}`}>{extra}</span>}
        </div>
        <div className="max-w-[170px] text-[12.5px] leading-tight text-text-muted">{titulo}</div>
      </div>
    </div>
  );
}

function Titulo({ texto, nota, enlace }: { texto: string; nota?: string; enlace?: string }) {
  return (
    <h2 className="mb-3.5 flex items-center gap-2.5 text-[15px] font-semibold">
      {texto}
      <span className="ml-auto flex items-center gap-2 text-[12.5px] font-semibold text-text-subtle">
        {nota}
        {enlace && (
          <Link href={enlace} className="eleg-ib" aria-label={`Abrir ${texto}`}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </Link>
        )}
      </span>
    </h2>
  );
}

function Filas({
  filas,
  vacio,
}: {
  vacio: string;
  filas: Array<{ id: string; href: string; izquierda: ReactNode; titulo: string; sub: string; derecha: string; fuerte: boolean }>;
}) {
  if (filas.length === 0) return <p className="text-sm text-text-muted">{vacio}</p>;
  return (
    <div className="flex flex-col">
      {filas.map((f, i) => (
        <Link key={f.id} href={f.href} className={`flex items-center gap-3 py-2.5 ${i ? "border-t border-border" : ""}`}>
          {f.izquierda}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{f.titulo}</span>
            <span className="block truncate text-[12.5px] text-text-muted">{f.sub}</span>
          </span>
          <span className={`ml-auto shrink-0 whitespace-nowrap text-right ${f.fuerte ? "font-semibold" : "text-text-muted"}`}>{f.derecha}</span>
        </Link>
      ))}
    </div>
  );
}
