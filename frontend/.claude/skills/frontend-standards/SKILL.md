---
name: frontend-standards
description: Padrão de código pessoal para frontends novos - Vite + React 19 + TanStack Router/Query + shadcn/ui + Tailwind v4. Use ao iniciar um projeto frontend novo do zero ou ao criar tela/componente/hook novo em projeto que já segue esse padrão. Baseado no stack real de sofon-pabx/frontend.
---

# Frontend Standards (Vite + React + TanStack + shadcn/ui)

Padrão extraído de `sofon-pabx/frontend`, pra replicar em todo projeto novo. SPA, não Next.js - sem app router, sem server components, sem server actions.

## Stack fixo

| Camada | Escolha |
|---|---|
| Build | Vite + React 19 |
| Roteamento | `@tanstack/react-router` (file-based, `src/routes/`) |
| Server state | `@tanstack/react-query` v5 (nunca fetch+useEffect manual, exceto exceção documentada) |
| UI | shadcn/ui sobre `@base-ui/react` (Base UI, não Radix), ícones `lucide` |
| Estilo | Tailwind v4, CSS-first (`@theme inline`, sem `tailwind.config.js`) |
| Forms | `react-hook-form` + `zod` via `@hookform/resolvers/zod` |
| HTTP | instância `axios` única (não fetch cru) |
| Pkg manager | bun |
| Lint/Format | Biome (lint + format num tool só) |
| Outros | `date-fns`, `sonner` (toast), `clsx`+`tailwind-merge` (`cn()`), `class-variance-authority` |

`tsconfig`: `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. Alias `@/*` -> `./src/*`.

## Idioma

- Código (nome de variável, função, componente, arquivo, tipo, branch, commit): sempre em inglês.
- Comentário: sempre em pt-BR.
- Texto visível ao usuário (label, toast, placeholder, mensagem de validação, texto de UI em geral): pt-BR sempre que possível.

## Comentários

- Todo arquivo começa com um comentário de 1-2 linhas em pt-BR dizendo o que ele faz, antes do primeiro import - ajuda a navegar sem abrir o arquivo inteiro.
- Fora isso, comentário só explica o porquê não-óbvio, nunca o quê (código com nome bom já fala por si) - ver [Regras gerais](#regras-gerais).

## Arrow function vs `function`

- Componente React: sempre `export function X(...)`, nunca arrow (ver [Componentes](#componentes)) - nome aparece limpo em stack trace/React DevTools.
- Tudo mais - função dentro de hook, callback, helper de `lib/`, handler de evento - usa arrow function: `const handleSubmit = async (form: TrunkCreateForm) => { ... }`.

## shadcn/ui

- Inicializar o projeto com `bunx shadcn@latest init -b base` e manter `components.json` versionado. O init já gera `src/index.css` com os tokens (`--background`, `--primary`, `--radius`... em oklch) e o layer base do Tailwind - **não redefinir token em outro arquivo, não criar paleta/CSS var paralela**, sempre consumir o que já existe.
- **Antes de implementar qualquer elemento de UI na mão, checar se já existe primitivo shadcn equivalente** e baixar via CLI (`bunx shadcn@latest add <nome>`). Nunca montar do zero com `div`+Tailwind cru algo que já é primitivo. Lista dos mais esquecidos:
  - Overlay: `dialog`, `alert-dialog`, `sheet`, `popover`, `tooltip`, `hover-card`, `dropdown-menu`, `context-menu`, `command` (combobox/busca)
  - Navegação: `tabs`, `breadcrumb`, `pagination`, `navigation-menu`, `accordion`
  - Feedback: `alert`, `badge`, `skeleton`, `progress`
  - Form: `checkbox`, `radio-group`, `switch`, `slider`, `select`, `calendar`+`popover` (date picker), `input-otp`, `form` (wrapper do react-hook-form)
  - Dados: `table`, `avatar`, `separator`, `scroll-area`, `carousel`
- Padrão visual complexo (tela de login, shell de dashboard, sidebar): olhar os *blocks* do shadcn (`bunx shadcn@latest add login-01`, `sidebar-07` etc.) antes de montar layout do zero.
- Variante nova de um componente existente (ex: botão com cor extra) estende o `cva` já presente em `components/ui/<componente>.tsx`; não cria componente irmão do zero.
- Baixar cada primitivo necessário pelo CLI, por exemplo `bunx shadcn@latest add button input card select`; nunca reescrever componentes shadcn manualmente.
- Usar os componentes gerados em `src/components/ui/`. Se o projeto já tiver primitivos manuais equivalentes, substituí-los pelos gerados.
- **`<Select>` (Base UI) sobre enum traduzido: sempre passar `items={labelsMap}` na raiz.** Base UI (diferente do Radix) não sincroniza automaticamente o texto do `SelectItem` selecionado pro trigger fechado - sem `items`, `<SelectValue>` cai no fallback e mostra o valor bruto do enum (ex: `checking`) em vez do label (`Conta corrente`), mesmo com o `SelectItem` já usando o label certo no dropdown aberto. `items` aceita `Record<string, ReactNode>`, exatamente o formato do mapa de labels que já existe:

```tsx
const typeLabels: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupança",
  brokerage: "Corretora",
  wallet: "Carteira",
};

<Select items={typeLabels} value={field.value} onValueChange={field.onChange}>
  <SelectTrigger>
    <SelectValue placeholder="Selecione o tipo" />
  </SelectTrigger>
  <SelectContent>
    {accountTypes.map((type) => (
      <SelectItem key={type} value={type}>{typeLabels[type]}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

Vale pra todo `<Select>` sobre enum/união de valores (tipo de conta, tipo de categoria, frequência etc.); não precisa em select cujo item mostra campo natural do dado (`account.name`, `category.name`) porque aí o valor já É o label.

**Não usar** a diretiva `"use client"` em projeto novo - é cargo-cult de template Next.js/shadcn, não tem efeito nenhum em Vite SPA. **Não usar husky/lint-staged/pre-commit** - Biome configurado desde o início (lint + format), só scripts `lint`/`format`/`check` manuais.

## Estrutura de pastas

```
src/
  routes/                      # rotas file-based do TanStack Router
    __root.tsx                  # providers (Query, Theme), Toaster, error/404 boundary
    dashboard.tsx                # layout route
    dashboard/
      trunks.tsx                  # rota simples: página + lógica
      flows.tsx                   # layout puro: só <Outlet/> quando há sub-rotas
      flows.index.tsx             # conteúdo da listagem
      flows.$id.tsx                # rota dinâmica (segmento $id)
  components/
    ui/                         # primitivos shadcn (button.tsx, dialog.tsx, field.tsx...)
    Trunks/                     # PascalCase por domínio/recurso
      trunk-form-dialog.tsx        # kebab-case dentro do domínio
      trunks-table.tsx
    page-header.tsx             # componente genérico/compartilhado: direto em components/, sem subpasta
    confirm-delete-dialog.tsx
  hooks/                       # flat, um arquivo por recurso, kebab-case use-xxx.ts(x)
  lib/                        # api.ts, utils.ts, outras integrações transversais
```

Regra: pasta de domínio em PascalCase espelha o nome do recurso; rota, hook e pasta de componente do mesmo recurso têm o mesmo nome (`trunks.tsx` -> `use-trunks.ts` -> `Trunks/`). Componente genérico sem domínio específico não ganha subpasta.

Rota com sub-páginas: arquivo `<nome>.tsx` só com `<Outlet/>` (layout) + `<nome>.index.tsx` (lista) + `<nome>.$id.tsx` (detalhe):

```tsx
export const Route = createFileRoute("/dashboard/flows")({
    component: () => <Outlet />,
})
```

## Componentes

- Arquivo kebab-case, componente exportado PascalCase, sempre `export function X(...)` - nunca default export, nunca `const X = () =>`.
- Props: `type Props = {...}` (nunca `interface`), destructuring direto na assinatura. União discriminada quando o componente tem dois modos (create vs edit):

```tsx
type Props =
    | { open: boolean; onOpenChange: (open: boolean) => void; trunk: null; onCreate: (form: TrunkCreateForm) => Promise<Trunk | null>; onUpdate?: never }
    | { open: boolean; onOpenChange: (open: boolean) => void; trunk: Trunk; onCreate?: never; onUpdate: (form: TrunkUpdateForm) => Promise<boolean> }
```

- Um componente por arquivo. Tipos/schemas do domínio ficam no hook que é dono da entidade, não em `types.ts` separado.
- Tabela (presentacional, recebe dados+callbacks) separada do dialog de formulário; a rota/página orquestra os dois + o dialog de confirmação de delete.
- Subcomponente usado só por um formulário: define inline no mesmo arquivo, não cria arquivo novo.

## Hooks de recurso

Um hook por recurso, encapsula CRUD completo. Padrão:

```tsx
export function useTrunks(companyId?: string) {
    const [filter, setFilter] = useState("")
    const { data: trunks = [], isLoading: loading } = useQuery({
        queryKey: ["trunks", companyId],
        queryFn: () => fetchTrunksRequest(companyId!),
        enabled: !!companyId,
    })

    const createMutation = useMutation({ mutationFn: createTrunkRequest, onSuccess: () => qc.invalidateQueries({ queryKey: ["trunks", companyId] }) })

    async function createTrunk(form: TrunkCreateForm) {
        const id = toast.loading("Criando trunk...")
        try {
            const trunk = await createMutation.mutateAsync(form)
            toast.success("Trunk criado", { id })
            return trunk
        } catch (err) {
            toast.error(apiError(err, "Erro ao criar trunk"), { id })
            return null
        }
    }

    const filtered = useMemo(() => trunks.filter(t => t.name.includes(filter)), [trunks, filter])

    return { trunks: filtered, loading, filter, setFilter, createTrunk, updateTrunk, deleteTrunk }
}
```

- Retorno sempre objeto plano (nunca tupla), sempre inclui `loading` (renomeado de `isLoading`).
- Função de mutation retorna `Promise<boolean>` (ou a entidade/id no create) pra quem chama poder decidir fechar o dialog: `if (ok) onOpenChange(false)`.
- Tipos e schemas Zod da entidade exportados do próprio arquivo do hook: `export type TrunkCreateForm = z.infer<typeof createTrunkSchema>`.
- Se o schema espelha validação do backend, comentar de onde: `// Espelha baseTrunkShape de backend/src/modules/trunks/schemas/trunk.schema.ts`.
- **Exceção deliberada**: dado que não deve resetar `loading` em refetch (ex: canvas que não pode desmontar) usa `useState`+`useCallback`+`useEffect`+`useRef` manual em vez de React Query - só nesse caso, documentado explicitamente no código.

## Types de componente (`types.ts` por domínio)

Cada pasta de domínio em `components/<Dominio>/` centraliza os tipos de Props de todos os componentes daquela pasta num único `types.ts`, em vez de `type Props = {...}` inline em cada arquivo:

- Nome do tipo: `<NomeDoComponente>Props` (não `Props` genérico) - evita colisão de nome quando centralizado num arquivo só.
- `type` sempre, nunca `interface`; união discriminada quando o componente tem dois modos continua lá dentro do `types.ts`, só muda de arquivo.
- Componente importa como `import type { AnnouncementFormDialogProps } from "./types"` e usa direto na assinatura - sem desestruturar num alias `Props` local.
- `types.ts` é só pra Props de componente. Tipo de entidade (`Announcement`, `Trunk`...) e schema Zod continuam no hook dono (`use-announcements.ts`) - `types.ts` importa de lá quando precisa, nunca redeclara.
- Vale mesmo pra domínio com um único arquivo de componente - consistência entre pastas importa mais que economizar um arquivo.
- Subcomponente definido inline (só usado por um formulário, ver seção Componentes) não migra - a regra é por arquivo de componente próprio, não por tipo aninhado sem uso externo.
- Não se aplica a `components/ui/` nem a pasta vendorizada (ver seção seguinte).
- **Caso especial - tipo de formulário local (não vem de hook)**: quando o Props referencia um tipo que não é entidade nem vem de `@/hooks/use-x` (ex: `type AudioFormValues = z.infer<typeof schema>` declarado no próprio componente, schema Zod inline sem hook dono), o tipo continua exportado do arquivo do componente (`export type AudioFormValues = ...`) e `types.ts` importa de volta de lá (`import { type AudioFormValues } from "./audio-form-dialog"`). É import circular só de tipo - inofensivo com `verbatimModuleSyntax` (apagado na compilação, zero efeito em runtime) - mas só usar quando não há hook dono pra esse tipo; se houver, o tipo migra pro hook, não fica solto no componente.

## Código vendorizado (não é domínio próprio)

Pastas de componentes copiadas/geradas de uma lib externa (ex: `components/ui/` do shadcn, `components/shadcnmaps/` de um bloco shadcn de mapa) seguem convenção própria da lib de origem (`interface Props`, `"use client"`, etc.) e **não entram** em nenhuma regra deste documento - não mexer, não refatorar, não aplicar a seção de extração de hooks abaixo. Reconhecer pelo padrão: pasta baixada via CLI/copy-paste de um registry externo, sem lógica de domínio da aplicação.

## Extração de lógica interna em hooks

Regra vale além de CRUD de recurso (seção anterior): qualquer bloco de lógica com responsabilidade própria - tem estado dedicado, roda em resposta a evento/efeito específico, e faz sentido nomear como uma coisa ("autosave do rascunho", "sync de edges com o servidor", "layout automático ELK") - vira hook próprio, mesmo sem fetch/mutation nenhum.

Sinal de que um componente precisa disso: mais de ~400-500 linhas, ou `useCallback`/`useEffect` que claramente pertencem a grupos diferentes (um cuida de autosave, outro de sync de rede, outro de drag-and-drop) todos soltos no mesmo escopo. Contra-exemplo real do projeto: `components/Flows/flow-canvas.tsx` (3300+ linhas, um componente só) mistura autosave de rascunho, sync de edge com debounce, CRUD de node/resource, layout ELK e undo/redo - tudo deveria estar em hooks tipo `useFlowDraftAutosave`, `useEdgeSync`, `useFlowResourceCrud`, `useFlowLayout`, com o componente só orquestrando + JSX.

- Nome: `use<Responsabilidade>` (não `use<Entidade>`, esse é reservado pro hook de recurso/CRUD).
- Local: colocated no mesmo arquivo do componente se só ele usa; em `hooks/` só se outro componente também precisar.
- Retorno: objeto plano, mesma convenção do hook de recurso.
- Extrair mesmo quando os hooks internos compartilham estado (ex: sync de edge depende do resultado do CRUD de node) - nesse caso a interface entre os hooks precisa ser desenhada explicitamente (um recebe o retorno do outro como argumento), não colada por closure compartilhado dentro de um componente gigante.

## Data fetching

- Uma instância `axios` (`lib/api.ts`), `baseURL` de env de build, `withCredentials: true`.
- Token em cookie, interceptor de request anexa; interceptor de response refresca em 401 com promise única de-duplicada (`refreshing ??= ...`) pra não disparar múltiplos refresh em paralelo.
- `apiError(err, fallback)` central: traduz erro do axios pra string amigável, com prioridade zod-do-backend > dicionário conhecido > mensagem do backend > fallback por status > fallback de rede. Toda mutation usa isso no `toast.error`.
- `QueryClient` único (`components/query-provider.tsx`): `retry: false`, `refetchOnWindowFocus: false`, `QueryCache.onError` global faz toast de falha de query (não de mutation) a menos que `query.meta?.suppressErrorToast`.
- Padrão de toast em toda mutation: `toast.loading -> mutateAsync -> toast.success/error`, nunca silencioso (exceto autosave documentado).

## Dialogs, carregamento e largura

- **Dialog com conteúdo variável (tipo ou item escolhido):** guardar o que mostrar separado do `open` (`const [kind, setKind]` + `const [open, setOpen]`). Fechar só muda `open`, nunca limpa o tipo/item. Derivar `open={item !== null}` e zerar o item no fechamento esvazia o dialog durante a animação de saída (título e conteúdo somem e sobra uma caixa vazia).
- **Todo dialog, aba ou card que busca dados tem skeleton** no formato do conteúdo final: tabela com `TableSkeletonRows` (cabeçalho fixo, linhas fantasmas), lista de cards com cards de `Skeleton` (mesma borda e padding, 2 a 3 linhas de alturas e larguras diferentes). Nunca área vazia nem spinner solto. Estado vazio (`ListEmpty`) só com `!loading`.
- **Conteúdo de página e de aba ocupa a largura do container.** Sem `max-w-*` em bloco de conteúdo (form, resumo, estado vazio) só para "não esticar": deixa um vão à direita e desalinha com as abas vizinhas, que são tabelas de largura total. `max-w-*` só onde é intencional (login, campo de busca, pódio, balão de anexo, célula de tabela com texto longo).
- **Contador dentro de botão:** badge compacto, nunca o `Badge` no tamanho padrão: `ml-auto h-4 min-w-4 rounded-full px-1 text-[0.625rem] leading-none`.

## Estilo

- Tailwind v4 CSS-first, tokens em `oklch()`, `@theme inline`, dark mode via classe `.dark` no `<html>`.
- `ThemeProvider`/`useTheme` custom com `localStorage` + `prefers-color-scheme` + sync entre abas via `storage` event. Default `"dark"`.
- `cn()` (`clsx`+`tailwind-merge`) pra toda classe condicional.
- **Toda ação destrutiva é vermelha** (apagar, remover, descartar, encerrar, revogar, sair do grupo): botão com texto, ícone de linha de tabela e confirmar de dialog usam `variant="destructive"` do `Button`; item de menu usa `variant="destructive"` do `DropdownMenuItem`. Editar, salvar, cancelar e fechar não.
- Biome com a regra `nursery.useSortedClasses` pra ordenar classes Tailwind automaticamente; configurar `options.functions: ["cn", "cva"]` no `biome.json`.
- Classes sempre inline em JSX, sem CSS modules, sem styled-components.
- Cor semântica sempre (`text-muted-foreground`, `bg-destructive`, `border`) - nunca cor bruta da paleta (`text-gray-500`).
- **Botão que faz papel de campo** (trigger de date picker, combobox, qualquer `Button variant="outline"` numa linha de `Input`/`Select`) leva a borda e o fundo do campo: `border-input bg-input/20 dark:bg-input/30 dark:hover:bg-input/50`. O `outline` usa `border-border`, mais apagado, e fica destoando ao lado do input. Nunca hex fixo (`dark:border-[#383838]!`) pra compensar.

### Avisos informativos (`Alert`)

- Nunca parágrafo corrido com várias frases emendadas por ponto final. Uma ideia por linha: lista (`<ul className="list-disc space-y-0.5 pl-4">`) quando há 2+ pontos, frase única curta quando é 1 só.
- Título curto dizendo o essencial; o detalhe vai nos tópicos, cada tópico 1 frase curta.
- Sempre com tom semântico pelo `variant` do `Alert`, nunca o default neutro quando o aviso tem significado: `info` (azul, comportamento a saber), `warning` (âmbar, atenção/efeito colateral), `success` (verde, confirmação), `danger`/`destructive` (vermelho, erro/ação irreversível). Ícone combinando: `InfoIcon`, `TriangleAlertIcon`, `CircleCheckIcon`, `CircleXIcon`.
- Se o `Alert` do projeto não tiver esses variants, adicionar no `cva` de `components/ui/alert.tsx` seguindo a receita soft: `border-transparent bg-{cor}-500/10 text-{cor}-700 dark:bg-{cor}-400/15 dark:text-{cor}-300`, descrição com o mesmo tom em `/85`. Nunca borda colorida + bg `/10`.
- Texto do aviso fica em dado (`{ variant, title, items: string[] }`) quando varia por opção (ex: por ação selecionada), não JSX hardcoded espalhado.

## State management

- Server/remoto: sempre TanStack Query. Local de UI (dialog aberto, item em edição/deleção, filtro): `useState` na própria rota/página.
- Global só quando cross-cutting de verdade: `AuthProvider`/`useAuth` e `ThemeProvider`/`useTheme`, ambos lançando erro se usado fora do provider.
- Form: sempre `react-hook-form`. Dialog com modo create/edit: duas instâncias de `useForm` (uma por schema), troca de qual usar por `isEdit`. `useFieldArray` pra subform repetível, `useWatch` pra UI condicional.

## TypeScript

- `type` sempre, nunca `interface`, pra props e shapes de dado.
- Tipo de formulário sempre derivado do schema Zod (`z.infer`), nunca escrito à mão - schema é fonte única da verdade.
- Sem pasta `types/` central - tipo colocated no hook dono da entidade.
- `any` só como escape hatch documentado (comentário explicando o motivo), nunca silencioso.

## Regras gerais

- Comentário só explica o porquê não-óbvio, nunca o quê (código com nome bom já fala por si) - ver [Idioma](#idioma).
- Necessidade de UI comum (modal, dropdown, tooltip, tabs, avatar, badge, skeleton, combobox, empty state) = presumir que shadcn já resolve. Buscar o primitivo/block antes de implementar na mão.
- Strings de UI direto no componente, sem central i18n (a menos que o projeto precise de múltiplos idiomas).
- Nunca deixar o projeto sem `lint`/`format`/`typecheck` configurados desde o commit inicial.
