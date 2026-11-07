# backend (Supabase)

Aplicar manualmente no SQL Editor do Supabase (ou `supabase db push` se usar a CLI), nesta ordem:

1. `supabase/migrations/20261107120000_create_presets.sql`
2. `supabase/migrations/20261107150000_public_presets_category.sql` (coluna `category`; o front passa a selecioná-la, então aplique antes de subir o front novo)
3. `supabase/seed.sql` (47 presets oficiais em 9 categorias, pode rodar de novo: só insere os que faltam e atualiza categoria e ordem)

Google OAuth: Authentication > Providers > Google. Redirect URL do app em Authentication > URL Configuration.

Variáveis do front (`frontend/.env`): `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. Nunca a service role.
