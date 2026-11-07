-- Categoria dos presets oficiais (Filme, Anime, Cinema...). Só texto de agrupamento, sem efeito no params.
alter table public.public_presets
    add column category text not null default 'Geral'
        check (char_length(category) between 1 and 30);
