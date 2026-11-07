-- Tabelas de presets (oficiais e do usuário) com RLS. A foto nunca passa por aqui.

-- Trigger genérico de updated_at (search_path fixo evita hijack de função).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Presets oficiais: leitura pública, escrita só por painel/SQL/service role.
create table public.public_presets (
    id uuid primary key default gen_random_uuid(),
    name text not null check (char_length(name) between 1 and 50),
    params jsonb not null
        check (jsonb_typeof(params) = 'object' and pg_column_size(params) <= 2048),
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

create index public_presets_sort_order_idx on public.public_presets (sort_order);

alter table public.public_presets enable row level security;

create policy "public_presets_select_all"
    on public.public_presets
    for select
    to anon, authenticated
    using (true);

-- "Automatically expose new tables" desligado no projeto: os grants são explícitos.
-- Só SELECT para clientes; sem policy de escrita, nem insert/update/delete existe.
grant select on public.public_presets to anon, authenticated;

-- Presets do usuário: tudo escopado por auth.uid().
create table public.user_presets (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name text not null check (char_length(name) between 1 and 50),
    params jsonb not null
        check (jsonb_typeof(params) = 'object' and pg_column_size(params) <= 2048),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index user_presets_user_id_idx on public.user_presets (user_id);

create trigger user_presets_set_updated_at
    before update on public.user_presets
    for each row execute function public.set_updated_at();

alter table public.user_presets enable row level security;

-- (select auth.uid()) é avaliado uma vez por query, não por linha.
create policy "user_presets_select_own"
    on public.user_presets
    for select
    to authenticated
    using (user_id = (select auth.uid()));

create policy "user_presets_insert_own"
    on public.user_presets
    for insert
    to authenticated
    with check (user_id = (select auth.uid()));

create policy "user_presets_update_own"
    on public.user_presets
    for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "user_presets_delete_own"
    on public.user_presets
    for delete
    to authenticated
    using (user_id = (select auth.uid()));

-- Grant só para authenticated (RLS filtra por linha). Anônimo nunca toca em user_presets.
grant select, insert, update, delete on public.user_presets to authenticated;
