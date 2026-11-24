"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { cookieSecure } from "@/lib/supabase/cookie-secure";

export async function toggleSidebar(currentlyCollapsed: boolean): Promise<void> {
  const store = await cookies();
  store.set("sidebar_collapsed", currentlyCollapsed ? "0" : "1", {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(),
    path: "/",
    // Sin maxAge: dura la sesión del navegador; al volver a entrar, la barra empieza contraída.
  });
  revalidatePath("/app", "layout");
}
