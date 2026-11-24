import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** "Embudo" abre directo el embudo activo (el predeterminado de la organización). */
export default async function EmbudoActivoPage() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/app");
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_pipelines")
    .select("id")
    .eq("organization_id", org.orgId)
    .eq("is_archived", false)
    .order("is_default", { ascending: false })
    .order("position")
    .limit(1);
  const id = (data?.[0] as { id: string } | undefined)?.id;
  redirect(id ? `/app/pipelines/${id}` : "/app/kanban");
}
