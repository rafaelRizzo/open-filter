-- Limite de presets por usuário (10000). Imposto no banco: o front só traduz a mensagem de erro.
create or replace function public.enforce_user_presets_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    -- Serializa inserts do mesmo usuário: sem isso, inserts simultâneos furariam o limite.
    perform pg_advisory_xact_lock(hashtext(new.user_id::text));
    if (select count(*) from public.user_presets where user_id = new.user_id) >= 10000 then
        raise exception 'preset_limit_reached' using errcode = 'P0001';
    end if;
    return new;
end;
$$;

create trigger user_presets_enforce_limit
    before insert on public.user_presets
    for each row execute function public.enforce_user_presets_limit();
