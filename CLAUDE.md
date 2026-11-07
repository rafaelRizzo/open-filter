# open-filter

Editor de fotos web, processamento 100% no cliente. Docs em `docs/`.

## Escopo (decisão do usuário)

App **básico de filtros para uma foto só**, não um editor completo. Fora do escopo: dupla exposição, juntar ou compor várias fotos, camadas, máscaras. Dentro: ajustes de tom e cor, curvas, HSL por canal, color grading, presets, antes/depois, exportar.

## Docs (`docs/`)

Documentação do projeto em pt-BR, índice em `docs/README.md`: `arquitetura`, `editor` (params, shader, geometria, export), `dados` (IndexedDB, Supabase, presets, backup), `atalhos`, `desenvolvimento`. **Mudou comportamento, schema de params, atalho ou fluxo de dados: atualizar o doc correspondente na mesma tarefa.** O diálogo de atalhos (`ui/shortcuts-dialog.tsx`) e `docs/atalhos.md` andam juntos.

## Estrutura

- `frontend/`: Vite + React + TypeScript + TanStack Router/Query + PixiJS + Tailwind. Tem `CLAUDE.md` e `.claude/skills` próprios.
- `backend/`: Supabase (migrations SQL, RLS, seeds de `public_presets`). Sem servidor próprio. Tem `CLAUDE.md` próprio.
- `.claude/skills/`: skills compartilhadas (fluxo, revisão, commit/PR, domínio).

## Regras que valem para tudo

- Código em inglês, comentário em pt-BR, texto visível ao usuário em pt-BR.
- Todo arquivo abre com 1 a 2 linhas de comentário em pt-BR dizendo o que faz. Comentário no meio só explica o porquê.
- Nunca usar travessão (—) em texto ou código: vírgula, dois-pontos ou hífen (-).
- Sem `any`. Se o tipo não fecha, o tipo está errado.
- Erro de I/O nunca engolido em silêncio.
- A foto NUNCA vai para servidor. Só contas e presets (JSON pequeno) vão para o Supabase.
- Nunca versionar `.env`. Só a anon key do Supabase no front.
- Preset não guarda `geometry` (corte, giro, espelho, endireitar, tamanho final): preset muda cor, não enquadramento. Qualquer chave nova em `editor/params.ts` exige revisar `seed.sql`.
- Um único filtro GLSL serve preview, miniaturas e exportação. Não criar segundo caminho de render.
- Nunca rodar migration, `DROP` ou `DELETE` amplo sem o usuário pedir.

## Commits

Monorepo: `gerar-commit` com escopo `(front|back|full)`. Todo commit termina com linha em branco + `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Skills compartilhadas (`.claude/skills/`)

| Skill | Quando |
|---|---|
| `grill-with-docs`, `grilling`, `domain-modeling` | Planejar: entrevista + ADRs + glossário (`CONTEXT.md`) |
| `codebase-design` | Desenhar módulos deep (ex: `editor/`, `photos/`) |
| `diagnosing-bugs` | Bug difícil, regressão de performance, WebGL |
| `code-review` | Revisar diff por etapa (Standards + Spec) |
| `gerar-commit`, `gerar-pr` | Commit e PR |

## Testes e verificação (decisão do usuário, NÃO esquecer)

**Nunca rodar nem escrever teste nenhum por conta própria.** Isso inclui `bun run test`, `test:coverage`, vitest e também scripts de verificação no navegador (playwright, Edge headless, e2e). O usuário roda tudo e pede quando quiser. Só `bun run typecheck` e `bun run build` são permitidos. Se precisar confirmar algo visual, descrever o que mudou e deixar o usuário conferir.
