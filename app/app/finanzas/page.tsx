import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { aDolares, dinero, gastoDeFacebook, gastoDeIa, nombreDelMes, ultimosMeses } from "@/lib/elegancia/datos";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Finanzas" };

/**
 * Finanzas (Elegancia de Amor): lo que entra (ventas cerradas) y lo que sale
 * (publicidad en Facebook/Instagram y la IA del CRM), mes a mes.
 * Solo gerente o administrador: son números de dinero de la empresa.
 */
export default async function FinanzasPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/app");
  if (ROLE_RANK[org.role] < ROLE_RANK.manager) redirect("/app");

  const meses = ultimosMeses(3);
  const admin = createAdminClient();
  const supabase = await createClient();

  const [ia, fb, { data: ventas }] = await Promise.all([
    gastoDeIa(admin, org.orgId, meses),
    gastoDeFacebook(admin, org.orgId, meses),
    supabase
      .from("crm_leads")
      .select("value_cents, currency, closed_at")
      .eq("organization_id", org.orgId)
      .eq("status", "won")
      .gte("closed_at", `${meses[0]}-01T00:00:00Z`)
      .limit(5000),
  ]);

  // Todo en dólares (Payphone): lo anotado en otra moneda se convierte.
  const vendidoUsd = new Map(meses.map((m) => [m, 0]));
  for (const v of (ventas ?? []) as Array<{ value_cents: number | null; currency: string | null; closed_at: string | null }>) {
    const m = (v.closed_at ?? "").slice(0, 7);
    if (!vendidoUsd.has(m)) continue;
    vendidoUsd.set(m, (vendidoUsd.get(m) ?? 0) + aDolares(v.value_cents, v.currency));
  }

  const mesActual = meses[meses.length - 1]!;
  const fbMes = fb.estado === "ok" ? (fb.meses.find((x) => x.mes === mesActual)?.centavos ?? 0) : 0;
  const iaMes = ia.find((x) => x.mes === mesActual);
  const vendidoMes = vendidoUsd.get(mesActual) ?? 0;
  const queda = vendidoMes - fbMes - (iaMes?.centavos ?? 0);

  return (
    <div className="flex flex-col gap-5 p-6">
      <header className="flex flex-wrap items-end gap-x-10 gap-y-4">
        <h1 className="max-w-xs text-4xl font-semibold leading-tight tracking-tight">Finanzas</h1>
        <p className="max-w-md text-sm text-text-muted">
          Lo que entra por ventas cerradas y lo que sale en publicidad y en la IA del CRM, de {nombreDelMes(meses[0]!)} a{" "}
          {nombreDelMes(mesActual)}.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <div className="text-sm text-text-muted">Vendido este mes</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight">{dinero(vendidoMes)}</div>
          <div className="mt-2 text-xs text-text-muted">Pedidos marcados como pagados (venta cerrada).</div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-text-muted">Gastado este mes</div>
          <div className="mt-2 text-4xl font-semibold tracking-tight text-error">
            −{dinero(fbMes + (iaMes?.centavos ?? 0), "USD", 2)}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            Facebook {fb.estado === "ok" ? dinero(fbMes, fb.moneda, 2) : "—"} · IA {dinero(iaMes?.centavos ?? 0, "USD", 2)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-sm text-text-muted">Queda</div>
          <div className={`mt-2 text-4xl font-semibold tracking-tight ${queda >= 0 ? "text-[var(--color-success)]" : "text-error"}`}>
            {dinero(queda, "USD", 2)}
          </div>
          <div className="mt-2 text-xs text-text-muted">Vendido menos publicidad e IA.</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Publicidad en Facebook e Instagram</h2>
          {fb.estado === "sin_conexion" && (
            <div className="rounded-2xl border border-dashed border-border p-5 text-sm">
              <p className="font-semibold">Conecta tu cuenta de Meta Ads para ver el gasto aquí.</p>
              <p className="mt-1 text-text-muted">Se lee directo de Facebook cada vez que abres esta pantalla.</p>
              <Link href="/app/settings/meta-ads" className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                Conectar Meta Ads
              </Link>
            </div>
          )}
          {fb.estado === "error" && (
            <p className="text-sm text-error">No se pudo leer el gasto de Facebook ahora: {fb.detalle}</p>
          )}
          {fb.estado === "ok" && <Barras meses={fb.meses} moneda={fb.moneda} />}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">IA del CRM</h2>
          <Barras meses={ia} moneda="USD" conLlamadas />
          <p className="mt-4 text-xs text-text-muted">
            Lo que cobran los modelos de IA por las respuestas del CRM. El detalle por agente está en{" "}
            <Link href="/app/ai/usage" className="underline underline-offset-4">Uso y presupuesto</Link>.
          </p>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 text-[15px] font-semibold">Mes a mes</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
              <th className="py-2 font-semibold">Mes</th>
              <th className="py-2 text-right font-semibold">Vendido</th>
              <th className="py-2 text-right font-semibold">Facebook</th>
              <th className="py-2 text-right font-semibold">IA</th>
              <th className="py-2 text-right font-semibold">Queda</th>
            </tr>
          </thead>
          <tbody>
            {[...meses].reverse().map((m) => {
              const v = vendidoUsd.get(m) ?? 0;
              const f = fb.estado === "ok" ? (fb.meses.find((x) => x.mes === m)?.centavos ?? 0) : 0;
              const a = ia.find((x) => x.mes === m)?.centavos ?? 0;
              const q = v - f - a;
              return (
                <tr key={m} className="border-t border-border">
                  <td className="py-2.5 capitalize">{nombreDelMes(m)}</td>
                  <td className="py-2.5 text-right font-semibold">{dinero(v)}</td>
                  <td className="py-2.5 text-right">{fb.estado === "ok" ? dinero(f, fb.moneda, 2) : "—"}</td>
                  <td className="py-2.5 text-right">{dinero(a, "USD", 2)}</td>
                  <td className={`py-2.5 text-right font-semibold ${q >= 0 ? "text-[var(--color-success)]" : "text-error"}`}>{dinero(q, "USD", 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Barras({
  meses,
  moneda,
  conLlamadas,
}: {
  meses: Array<{ mes: string; centavos: number; llamadas: number }>;
  moneda: string;
  conLlamadas?: boolean;
}) {
  const max = Math.max(1, ...meses.map((m) => m.centavos));
  return (
    <div className="flex flex-col gap-3">
      {meses.map((m) => (
        <div key={m.mes}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="capitalize">{nombreDelMes(m.mes)}</span>
            <span className="font-semibold">
              {dinero(m.centavos, moneda, 2)}
              {conLlamadas && <span className="ml-2 text-xs font-normal text-text-muted">{m.llamadas} respuestas</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-elevated">
            <div className="h-full rounded-full bg-accent" style={{ width: `${(m.centavos / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
