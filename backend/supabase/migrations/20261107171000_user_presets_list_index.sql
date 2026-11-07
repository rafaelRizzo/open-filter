-- A listagem filtra por user_id e ordena por created_at desc: o índice composto serve os dois sem sort.
-- Cobre também o count do trigger de limite e substitui o índice só de user_id (prefixo do novo).
create index user_presets_user_id_created_at_idx
    on public.user_presets (user_id, created_at desc);

drop index if exists public.user_presets_user_id_idx;
