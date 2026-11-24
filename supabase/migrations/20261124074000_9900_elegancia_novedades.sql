-- manifest: Elegancia — historial de cambios del CRM (pantalla /app/novedades). Global a la instalación, solo lectura para usuarios con sesión; se escribe con service role / SQL. Ya aplicada a mano en la base de producción el 24-nov-2026.
create table if not exists public.elegancia_novedades (
  id uuid primary key default gen_random_uuid(),
  ocurrio_en timestamptz not null default now(),
  tipo text not null check (tipo in ('nuevo','mejora','arreglo','diseno','datos')),
  titulo text not null check (length(titulo) between 3 and 160),
  detalle text,
  area text,
  version text,
  estado text not null default 'en_vivo' check (estado in ('en_vivo','en_camino')),
  creado_en timestamptz not null default now()
);
create index if not exists elegancia_novedades_ocurrio_idx on public.elegancia_novedades (ocurrio_en desc);
alter table public.elegancia_novedades enable row level security;
drop policy if exists elegancia_novedades_leer on public.elegancia_novedades;
create policy elegancia_novedades_leer on public.elegancia_novedades for select to authenticated using (true);
revoke all on public.elegancia_novedades from anon;
revoke insert, update, delete, truncate on public.elegancia_novedades from authenticated;
grant select on public.elegancia_novedades to authenticated;
