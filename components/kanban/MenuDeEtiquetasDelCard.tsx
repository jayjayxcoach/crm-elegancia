"use client";
/**
 * Etiquetas del card con CLIC DERECHO (Elegancia de Amor).
 *
 * Clic derecho en una tarjeta del embudo → menú con las etiquetas para marcar o
 * quitar. "En proceso" está siempre arriba: es la que dice con qué invitación
 * se está trabajando, y se ve en la tarjeta (ver `EtiquetaEnProcesoDelCard`).
 * Debajo van las demás etiquetas que ya tiene el negocio, para quitarlas.
 *
 * Graba en `crm_leads.tags` con `tags_adicionar` / `tags_remover` (unión y
 * diferencia en el servidor), así marcar una no pisa las otras.
 */
import { useT } from "@/hooks/i18n/useT";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import { useCorDaEtiqueta } from "@/components/tags/CoresDasEtiquetas";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import type { Lead } from "@/lib/types/leads";

/** Como queda guardada (el banco guarda las etiquetas en minúscula). */
export const ETIQUETA_EN_PROCESO = "en proceso";
/** Color de la etiqueta cuando no tiene uno elegido en Configuración › Etiquetas. */
const COLOR_EN_PROCESO = "#f5b942";

/** "en proceso" → "En proceso": solo la primera letra, para leer en la tarjeta. */
function rotulo(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

interface Props {
  lead: Lead;
  pipelineId: string;
  /** Dónde se hizo el clic derecho, relativo a la tarjeta. `null` = cerrado. */
  posicion: { x: number; y: number } | null;
  onCerrar: () => void;
}

export function MenuDeEtiquetasDelCard({ lead, pipelineId, posicion, onCerrar }: Props) {
  const t = useT();
  const edit = useEditLead(pipelineId);
  const actuales = lead.tags ?? [];
  const opciones = [ETIQUETA_EN_PROCESO, ...actuales.filter((tag) => tag !== ETIQUETA_EN_PROCESO)];

  const alternar = (tag: string, marcada: boolean) => {
    edit.mutate({
      leadId: lead.id,
      patch: marcada ? { tags_remover: [tag] } : { tags_adicionar: [tag] },
    });
  };

  return (
    // La tarjeta abre el dossier con cualquier clic que le llegue; el menú va en
    // portal y el clic sube por el árbol de React, así que se corta aquí.
    <span className="contents" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu open={posicion !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
        <DropdownMenuTrigger asChild>
          <span
            aria-hidden
            className="pointer-events-none absolute h-px w-px"
            style={{ left: posicion?.x ?? 0, top: posicion?.y ?? 0 }}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={2} onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuLabel>{t("Etiquetas")}</DropdownMenuLabel>
          {opciones.map((tag) => {
            const marcada = actuales.includes(tag);
            return (
              <DropdownMenuCheckboxItem
                key={tag}
                checked={marcada}
                onCheckedChange={() => alternar(tag, marcada)}
              >
                {rotulo(tag)}
              </DropdownMenuCheckboxItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/** La etiqueta "En proceso" visible en la tarjeta, cuando está marcada. */
export function EtiquetaEnProcesoDelCard({ tags }: { tags: readonly string[] }) {
  const cor = useCorDaEtiqueta(ETIQUETA_EN_PROCESO);
  if (!tags.includes(ETIQUETA_EN_PROCESO)) return null;
  return (
    <ChipDeEtiqueta
      tag={rotulo(ETIQUETA_EN_PROCESO)}
      cor={cor ?? COLOR_EN_PROCESO}
      data-testid="etiqueta-en-proceso"
      className="ml-auto h-4 shrink-0 px-1.5 py-0 text-[10px] leading-4"
    />
  );
}
