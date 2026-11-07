# Desenvolvimento

## Rodar

Requer [Bun](https://bun.sh).

```bash
cd frontend
cp .env.example .env   # VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
bun install
bun run dev
```

## Comandos

| Comando | Para quê |
|---|---|
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` | `tsc -b` + build de produção em `frontend/dist` |
| `bun run typecheck` | TypeScript 7 (sem `baseUrl`, só `paths`) |
| `bun run lint` | Biome, só em `src`. Nunca `--unsafe` sem revisar o diff |
| `bun run test`, `test:coverage` | Vitest (jsdom, fake-indexeddb) |

## Testes (regra do projeto)

O assistente **não roda nem escreve teste** por conta própria, nem script de navegador (playwright, Edge headless, e2e). Só `typecheck` e `build`. Quem roda e pede teste é o dono do projeto. Cobertura mínima configurada: 90% linhas, 80% ramos no código testável.

Já cobertos: `params`, `geometry`, `guides`, `curves`, `lut`, `history`, `tiles`, `uniforms`, `histogram`, `zip`, `backup`, `storage`, `theme`, `presets/api`, contrato do backend. Pendentes: `export`, hooks, componentes. `photo-editor-view.test.tsx` está quebrado de propósito até a UI assentar.

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Contas e presets |
| `VITE_REPO_URL` | Link "Ver o código" da landing (oculto se vazio) |

Nunca versionar `.env`. Nunca `service_role` no front.

## Deploy

Site estático: `bun run build` gera `frontend/dist`, raiz do projeto em `frontend`.

- Vercel: `frontend/vercel.json` traz o fallback de SPA.
- Netlify e Cloudflare Pages: `frontend/public/_redirects`.
- Defina as variáveis no painel do provedor.

## Releases

`.github/workflows/release.yml` roda a cada push na `main` (commit direto ou PR mergeada) e cria uma tag `vX.Y.Z` e uma release no GitHub, com as notas geradas pelos PRs e commits desde a release anterior. PR aberta, mas ainda não mergeada, não gera release.

A versão sobe pelos commits desde a última tag (Conventional Commits):

| Commit | Sobe |
|---|---|
| `tipo!:` ou `BREAKING CHANGE` no corpo | major (`v1.0.0`) |
| `feat:` | minor (`v0.2.0`) |
| qualquer outro (`fix`, `docs`, `chore`...) | patch (`v0.1.1`) |

A primeira release é `v0.1.0`. Para um commit não gerar release, escreva `[skip release]` na mensagem. O `version` do `frontend/package.json` não é atualizado: a fonte da versão é a tag.

## Configuração externa

- Google OAuth: Authentication > Providers > Google no Supabase.
- Em produção, adicionar a URL do site nas origens JS do Google e em Site URL e Redirect URLs do Supabase.

## Convenções

- Código em inglês, comentário e texto de UI em pt-BR.
- Todo arquivo abre com 1 a 2 linhas de comentário em pt-BR.
- Sem `any`, sem travessão (—), erro de I/O nunca engolido.
- `type` (nunca `interface`), sem default export, `cn()` para classe condicional.
- Commits: `gerar-commit` com escopo `(front|back|full)`.
