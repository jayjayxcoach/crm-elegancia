"use client";

/**
 * Buscar rápido (panel "Más" del celular, plantilla Elegancia): escribir el
 * nombre o el número de una clienta y abrir su chat directo en la Bandeja.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useT } from "@/hooks/i18n/useT";
import { rotuloParaAEquipe } from "@/lib/contacts/rotulo-do-contato";
import { phoneForDisplay } from "@/lib/channels/phone-variants";

export function BuscarRapido({ onCerrar }: { onCerrar: () => void }) {
  const t = useT();
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [items, setItems] = useState<ConversationWithContact[]>([]);
  const [cargando, setCargando] = useState(false);
  const entrada = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    entrada.current?.focus();
  }, []);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setItems([]);
      setCargando(false);
      return;
    }
    const control = new AbortController();
    setCargando(true);
    const espera = setTimeout(async () => {
      try {
        const r = await fetch(`/api/v1/conversations?search=${encodeURIComponent(q)}&limit=20`, {
          signal: control.signal,
          credentials: "same-origin",
        });
        const j = (await r.json()) as { data?: ConversationWithContact[] };
        setItems(Array.isArray(j.data) ? j.data : []);
      } catch {
        /* cancelada o sin red */
      } finally {
        if (!control.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [texto]);

  const abrir = (id: string) => {
    onCerrar();
    router.push(`/app/inbox?filter=all&id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="eleg-buscar">
      <div className="eleg-buscar-campo">
        <svg className="eleg-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={entrada}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          placeholder="Nombre o número de la clienta"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items[0]) abrir(items[0].id);
          }}
        />
      </div>
      <ul className="eleg-buscar-lista">
        {items.map((c) => {
          const nombre = rotuloParaAEquipe(c.contacts ?? null, t);
          const tel = c.contacts?.phone_number ? phoneForDisplay(c.contacts.phone_number) : "";
          return (
            <li key={c.id}>
              <button type="button" onClick={() => abrir(c.id)}>
                <span className="eleg-buscar-ini">{(nombre.trim()[0] ?? "?").toUpperCase()}</span>
                <span className="eleg-buscar-txt">
                  <b>{nombre}</b>
                  {tel && tel !== nombre && <small>{tel}</small>}
                </span>
                <ChannelLogo channel={c.channel_sessions ?? null} size={18} />
              </button>
            </li>
          );
        })}
      </ul>
      {texto.trim().length >= 2 && !cargando && items.length === 0 && (
        <p className="eleg-buscar-vacio">No encontré a nadie con ese nombre.</p>
      )}
      {cargando && <p className="eleg-buscar-vacio">Buscando…</p>}
    </div>
  );
}
