"use client";

/**
 * Línea de tiempo de Novedades (plantilla Elegancia): un hilo largo a la
 * izquierda que nace en un círculo "Ahora" y baja día por día; cada cambio es
 * un puntito de color (según su tipo) con su tarjeta de vidrio al lado.
 *
 * Se mantiene al día sola: cada 15 s, si la pestaña está a la vista, pide al
 * servidor la lista otra vez (router.refresh). Lo que llega después de abrir
 * la pantalla se resalta un momento.
 */
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export type TipoNovedad = "nuevo" | "mejora" | "arreglo" | "diseno" | "datos";

export interface Novedad {
  id: string;
  ocurrio_en: string;
  tipo: TipoNovedad;
  titulo: string;
  detalle: string | null;
  area: string | null;
  version: string | null;
  estado: "en_vivo" | "en_camino";
}

const TIPOS: Record<TipoNovedad, { nombre: string; plural: string }> = {
  nuevo: { nombre: "Nuevo", plural: "Nuevo" },
  mejora: { nombre: "Mejora", plural: "Mejoras" },
  arreglo: { nombre: "Arreglo", plural: "Arreglos" },
  diseno: { nombre: "Diseño", plural: "Diseño" },
  datos: { nombre: "Datos", plural: "Datos" },
};
const ORDEN: TipoNovedad[] = ["nuevo", "mejora", "arreglo", "diseno", "datos"];

// Hora de Ecuador siempre, igual en el servidor y en el teléfono (sin saltos al cargar).
const ZONA = "America/Guayaquil";
const fDia = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });
const fTituloDia = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
const fHora = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, hour: "numeric", minute: "2-digit", hour12: true });
const fCorto = new Intl.DateTimeFormat("es-EC", { timeZone: ZONA, day: "numeric", month: "short" });

function claveDia(iso: string): string {
  return fDia.format(new Date(iso));
}

function hace(iso: string, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export function LineaDeTiempo({ novedades }: { novedades: Novedad[] }) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<TipoNovedad | "todo">("todo");
  const [ahora, setAhora] = useState<number | null>(null);
  const vistos = useRef<Set<string> | null>(null);
  const [recien, setRecien] = useState<Set<string>>(new Set());

  // Refresco solo + reloj para "hace X min" (solo en el navegador).
  useEffect(() => {
    const primero = setTimeout(() => setAhora(Date.now()), 0);
    const t = setInterval(() => {
      setAhora(Date.now());
      if (document.visibilityState === "visible") router.refresh();
    }, 15000);
    const alVolver = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(primero);
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [router]);

  // Lo que aparece después de abrir la pantalla brilla un momento.
  useEffect(() => {
    if (!vistos.current) {
      vistos.current = new Set(novedades.map((n) => n.id));
      return;
    }
    const nuevos = novedades.filter((n) => !vistos.current!.has(n.id)).map((n) => n.id);
    if (nuevos.length === 0) return;
    nuevos.forEach((id) => vistos.current!.add(id));
    setRecien((r) => new Set([...r, ...nuevos]));
    const t = setTimeout(() => setRecien(new Set()), 8000);
    return () => clearTimeout(t);
  }, [novedades]);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todo: novedades.length };
    for (const n of novedades) c[n.tipo] = (c[n.tipo] ?? 0) + 1;
    return c;
  }, [novedades]);

  const visibles = filtro === "todo" ? novedades : novedades.filter((n) => n.tipo === filtro);

  const dias = useMemo(() => {
    const grupos: Array<{ clave: string; iso: string; items: Novedad[] }> = [];
    for (const n of visibles) {
      const k = claveDia(n.ocurrio_en);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.clave === k) ultimo.items.push(n);
      else grupos.push({ clave: k, iso: n.ocurrio_en, items: [n] });
    }
    return grupos;
  }, [visibles]);

  const hoyK = ahora ? claveDia(new Date(ahora).toISOString()) : null;
  const ayerK = ahora ? claveDia(new Date(ahora - 86400000).toISOString()) : null;
  const semana = ahora ? novedades.filter((n) => ahora - new Date(n.ocurrio_en).getTime() < 7 * 86400000).length : null;
  const ultimo = novedades[0];
  const primero = novedades[novedades.length - 1];

  const tituloDia = (clave: string, iso: string) => {
    if (clave === hoyK) return "Hoy";
    if (clave === ayerK) return "Ayer";
    const t = fTituloDia.format(new Date(iso));
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  return (
    <div className="nov">
      <header className="nov-cab">
        <div>
          <h1 className="nov-h1">Novedades</h1>
          <p className="nov-sub">Todo lo que se mejora en el CRM, en el momento en que entra.</p>
        </div>
        <span className="nov-vivo">
          <i />
          En vivo · se actualiza solo
        </span>
      </header>

      <div className="nov-cifras">
        <div className="nov-cifra">
          <b>{novedades.length}</b>
          <span>cambios en total</span>
        </div>
        <div className="nov-cifra">
          <b>{semana ?? "—"}</b>
          <span>en los últimos 7 días</span>
        </div>
        <div className="nov-cifra">
          <b>{ultimo && ahora ? hace(ultimo.ocurrio_en, ahora) : "—"}</b>
          <span>último cambio</span>
        </div>
      </div>

      <div className="nov-filtros" role="tablist" aria-label="Tipo de cambio">
        {(["todo", ...ORDEN] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={filtro === t}
            className={`nov-chip ${filtro === t ? "on" : ""}`}
            data-tipo={t}
            onClick={() => setFiltro(t)}
          >
            {t !== "todo" && <i className="nov-chip-pt" />}
            {t === "todo" ? "Todo" : TIPOS[t].plural}
            <small>{cuentas[t] ?? 0}</small>
          </button>
        ))}
      </div>

      <section className="nov-linea">
        <div className="nov-hilo" aria-hidden="true" />

        <div className="nov-ahora">
          <span className="nov-ahora-circ" aria-hidden="true">
            <span />
          </span>
          <div>
            <b>Ahora</b>
            <span>El CRM sigue mejorando. Cada cambio aparece aquí al instante.</span>
          </div>
        </div>

        {dias.length === 0 && <p className="nov-vacio">Todavía no hay cambios de este tipo.</p>}

        {dias.map((d) => (
          <div key={d.clave} className="nov-dia">
            <div className="nov-dia-tit">
              <span className="nov-dia-pt" aria-hidden="true" />
              {tituloDia(d.clave, d.iso)}
              <small>
                {d.items.length} {d.items.length === 1 ? "cambio" : "cambios"}
              </small>
            </div>

            {d.items.map((n) => (
              <article key={n.id} className={`nov-item ${recien.has(n.id) ? "recien" : ""}`} data-tipo={n.tipo}>
                <span className="nov-pt" aria-hidden="true" />
                <div className="nov-card">
                  <div className="nov-meta">
                    <span className="nov-tipo">{TIPOS[n.tipo]?.nombre ?? n.tipo}</span>
                    {n.estado === "en_camino" && <span className="nov-camino">En camino</span>}
                    {n.area && <span className="nov-area">{n.area}</span>}
                    <time className="nov-hora" dateTime={n.ocurrio_en}>
                      {fHora.format(new Date(n.ocurrio_en))}
                    </time>
                  </div>
                  <h3 className="nov-tit">{n.titulo}</h3>
                  {n.detalle && <p className="nov-det">{n.detalle}</p>}
                  {n.version && <span className="nov-ver">v {n.version}</span>}
                </div>
              </article>
            ))}
          </div>
        ))}

        {primero && filtro === "todo" && (
          <div className="nov-inicio">
            <span className="nov-inicio-circ" aria-hidden="true" />
            Inicio del historial · {fCorto.format(new Date(primero.ocurrio_en))}
          </div>
        )}
      </section>
    </div>
  );
}
