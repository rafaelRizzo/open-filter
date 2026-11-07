# backend

Só Supabase: Auth (Google OAuth) + Postgres. Sem API própria. Detalhes em `../docs/dados.md`.

## Estrutura

- `supabase/migrations/`: SQL versionado, um arquivo por mudança (`YYYYMMDDHHMMSS_nome.sql`).
- Seeds dos presets oficiais em arquivo SQL separado (gerenciados por painel/SQL/service role).

## Regras

- `public_presets`: `id uuid pk`, `name`, `category text` (default 'Geral', até 30 caracteres), `params jsonb`, `sort_order int`, `created_at`. RLS: SELECT para todos (inclusive `anon`), sem INSERT/UPDATE/DELETE para clientes.
- `user_presets`: `id uuid pk`, `user_id uuid references auth.users default auth.uid()`, `name`, `params jsonb`, `created_at`, `updated_at`. RLS: SELECT/INSERT/UPDATE/DELETE só onde `user_id = auth.uid()`.
- Limites no banco: `name` até 50 caracteres e CHECK de tamanho em `params` (ex: `pg_column_size(params) < 2048`). O cliente valida com o zod do front; o banco é a segunda barreira.
- RLS ligado em toda tabela do schema `public`, sem exceção. Policy com `to authenticated`/`to anon` explícito.
- Timestamps `timestamptz`. `updated_at` via trigger.
- Nunca confiar em `user_id` vindo do cliente: o default `auth.uid()` + `with check (user_id = auth.uid())` garantem.
- Nunca aplicar migration, `DROP` ou `DELETE` amplo sem confirmação explícita do usuário. Gerar o SQL, mostrar, parar.
- Nunca versionar `service_role` key. O front só usa a anon key.

## Skills

Sem skills próprias: nenhuma das pessoais (Bun/Fastify/Prisma/Drizzle) se aplica a Supabase puro. Usar as compartilhadas da raiz (`code-review`, `diagnosing-bugs`). Se o SQL de RLS crescer, vale criar uma skill `supabase-rls` aqui.
