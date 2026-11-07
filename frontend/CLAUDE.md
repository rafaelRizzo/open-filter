# frontend

Vite + React + TypeScript, TanStack Router/Query, PixiJS (um filtro GLSL), Tailwind mobile-first.

## Skills (`.claude/skills/`)

- `frontend-standards`: convenções de código, hooks, pastas, estilo. **Ajustes deste projeto abaixo.**
- `react-best-practices`: performance React. Valem as regras `async-`, `bundle-`, `client-`, `rerender-`, `rendering-`, `js-`, `advanced-`. Ignorar `server-` (sem SSR).
- `frontend-design`: direção visual da UI (editor, faixa de presets, galeria).

## Ajustes deste projeto sobre `frontend-standards`

| frontend-standards | Neste projeto |
|---|---|
| shadcn/ui + Base UI | Mantido (`base-nova`, tema neutro oklch em `index.css`). Primitivos em `components/ui` (não editar), composições do app em `src/ui/` |
| axios | `@supabase/supabase-js` direto nas queryFn |
| react-hook-form | Sem forms grandes: `useState` local |
| pnpm | bun. `bun run lint` (Biome), `typecheck`, `test`, `test:coverage` (Vitest, 100% no código testável), TS 7 (sem `baseUrl`, só `paths`) |
| rotas file-based | TanStack Router com loaders + `router context` (sessão) |
| pastas `components/`, `hooks/` | Pastas por domínio: `routes/ editor/ presets/ photos/ auth/ ui/` |
| `useState` p/ tudo de UI | Params do editor em `useRef`/objeto mutável direto nos uniforms; `useState` só p/ o que a UI exibe |

Mantém: componente = `export function X`, `type` (nunca `interface`), sem default export, `cn()` para classe condicional, cor semântica, TanStack Query para todo dado remoto/IndexedDB.

## Regras do editor

- Schema zod único (`editor/params`) reutilizado por UI, shader e validação de preset.
- Query keys: `['presets','public']`, `['presets','user',userId]`, `['photos']`, `['photos',id]`.
- Mutations de preset: invalidação + update otimista. Loaders usam `queryClient.ensureQueryData`.
- Blob no IndexedDB (nunca base64), params salvos com debounce de 500ms.
- Sem lint/format/typecheck faltando desde o commit inicial.

## Checklist antes de dar por pronto

1. `bun run typecheck` e `bun run build` passando (testes só o usuário roda). Nunca `biome --unsafe` sem revisar o diff.
2. Lint só nos arquivos tocados.

## Motion

`motion` (`motion/react`) com `MotionConfig reducedMotion="user"` na raiz. Transição de página com `AnimatePresence` no `__root`, entradas escalonadas nas telas, fade-in do canvas. Nunca animar o que roda por frame no shader (params vão por ref direto nos uniforms).
