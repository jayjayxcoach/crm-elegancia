import Link from "next/link";
import { NAV_CATALOG } from "@/lib/navigation/catalogo";
import type { Metadata } from "next";
import { NavHub } from "@/components/shell/NavHub";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { traduzir } from "@/lib/i18n/dicionario";
import { modulosLigados } from "@/lib/instalacao/modulos";
import { createAdminClient } from "@/lib/supabase/admin";
import { aparenciaDeSettings } from "@/lib/aparencia/ajustes";
import { hubSections, type NavGroupId } from "@/lib/navigation/registry";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Configuración" };

/* Plantilla Elegancia: todas las áreas del CRM viven aquí, en pestañas, con
   cuadritos compactos (ícono + nombre) para que cada área entre en una pantalla. */
const AREAS: Array<{ clave: string; group: NavGroupId; titulo: string }> = [
  { clave: "cuenta", group: "organizacao", titulo: "Cuenta y empresa" },
  { clave: "atencion", group: "atendimento", titulo: "Atención" },
  { clave: "crm", group: "crm", titulo: "CRM" },
  { clave: "ia", group: "ia", titulo: "Agente de IA" },
  { clave: "canales", group: "canais", titulo: "Canales" },
  { clave: "analisis", group: "analise", titulo: "Análisis" },
];

/**
 * Hub de Organização.
 *
 * A lista de cards que vivia aqui era uma segunda navegação escrita à mão, e
 * divergia do sidebar. Agora o conteúdo vem do registro.
 */
export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  const idioma = user.idioma;

  const admin = createAdminClient();
  const ligados = await modulosLigados(admin, activeOrg?.orgId);
  const agencia =
    ligados.includes("agencias") &&
    activeOrg &&
    !user.support &&
    (user.agency_org_ids ?? []).includes(activeOrg.orgId);
  const porta = NAV_CATALOG.find((d) => d.href === "/app/settings/organizacoes")!;

  let elegancia = false;
  if (activeOrg) {
    const { data: org } = await admin.from("organizations").select("settings").eq("id", activeOrg.orgId).maybeSingle();
    elegancia = aparenciaDeSettings((org as { settings?: unknown } | null)?.settings).template === "elegancia";
  }

  if (elegancia) {
    const sp = await searchParams;
    const pedida = typeof sp.area === "string" ? sp.area : "cuenta";
    const area = AREAS.find((a) => a.clave === pedida) ?? AREAS[0]!;
    const secciones = hubSections(
      area.group,
      user.is_platform_admin && !user.support,
      activeOrg?.role ?? null,
      // Sin el filtro del menú: aquí se ve todo lo que el rol permite.
      undefined,
      ligados,
    );
    return (
      <div className="eleg-config flex flex-col gap-5 p-2 sm:p-4">
        <header>
          <h1 className="text-[clamp(30px,3vw,44px)] font-semibold leading-tight tracking-[-0.025em]">Configuración</h1>
          <p className="text-sm text-text-muted">Todo el CRM, ordenado por área.</p>
        </header>
        <nav className="eleg-config-tabs" aria-label="Áreas">
          {AREAS.map((a) => (
            <Link key={a.clave} href={`/app/settings?area=${a.clave}`} className={a.clave === area.clave ? "on" : ""} scroll={false}>
              {a.titulo}
            </Link>
          ))}
        </nav>
        {agencia && area.clave === "cuenta" && (
          <Link className="eleg-config-item" href={porta.href}>
            {traduzir(porta.label, idioma)}
          </Link>
        )}
        {secciones.map(({ section, items }) => (
          <section key={section} className="flex flex-col gap-2.5">
            <h2 className="text-[11px] font-bold uppercase tracking-[.08em] text-text-subtle">{traduzir(section, idioma)}</h2>
            <div className="eleg-config-grid">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="eleg-config-item" title={traduzir(item.description, idioma)}>
                    <span className="eleg-config-ico">
                      <Icon size={19} weight="regular" aria-hidden />
                    </span>
                    <span className="eleg-config-nombre">{traduzir(item.label, idioma)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <>
      {agencia && (
        <Link className="mx-6 mt-6 block rounded-lg border p-6" href={porta.href}>
          <h2 className="font-semibold">{traduzir(porta.label, idioma)}</h2>
          <p className="text-sm text-muted-foreground">{traduzir(porta.description, idioma)}</p>
        </Link>
      )}
      <NavHub
        group="organizacao"
        isPlatformAdmin={user.is_platform_admin && !user.support}
        role={activeOrg?.role ?? null}
        interfaceSettings={activeOrg?.interface_settings}
        // A porta do banco externo mora neste hub, e só existe com o módulo ligado.
        modulosLigados={ligados}
        title={traduzir("Configurações", idioma)}
        subtitle={traduzir("Sua conta, os dados da empresa e quem tem acesso ao quê.", idioma)}
        locale={idioma}
      />
    </>
  );
}
