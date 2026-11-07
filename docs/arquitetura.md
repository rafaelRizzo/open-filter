# Arquitetura

App básico de filtros para **uma foto**, 100% no cliente. Fora do escopo: dupla exposição, camadas, máscaras, juntar fotos.

## Princípio central

A foto **nunca** vai para servidor. A original fica no IndexedDB como `Blob`. O servidor (Supabase) guarda só contas e presets (JSON pequeno). A edição é não destrutiva: original + params, o resultado é sempre regenerado.

## Pastas

```
frontend/src/
  routes/    TanStack Router (file-based): __root, index, app, editor.$photoId, presets, perfil
  editor/    schema de params, shader GLSL, geometria, curvas, LUT, histórico, tiles, exportação
  photos/    IndexedDB (idb), decode/EXIF, miniaturas, ZIP e backup, queries
  presets/   API Supabase, queries e miniaturas de preset
  auth/      cliente Supabase, store de sessão, hook de sessão
  ui/        telas e composições do app (painéis, diálogos, landing)
  components/ui/  primitivos shadcn (Base UI), não editar
  lib/       tema, storage, links, persistência do Query
backend/supabase/  migrations, seed
```

## Rotas

| Rota | Tela |
|---|---|
| `/` | Landing com o editor ao vivo (`ui/landing/`) |
| `/app` | Estúdio: importar foto (botão ou arrastando arquivos para qualquer ponto da tela, `photo-drop-zone.tsx`) e "Meu álbum" (busca por nome e ordenação por data ou nome) |
| `/editor/$photoId` | Editor (loader pré-carrega a foto e os presets públicos via `ensureQueryData`) |
| `/presets` | Meus presets (guard de login no `beforeLoad`, sessão vem do router context) |
| `/perfil` | Conta, armazenamento, backup e aparência (aberto a visitantes) |

## Layout do editor

Desktop (`md` e acima): três colunas. Presets à esquerda (288px, grade de miniaturas com rolagem própria, botão "Salvar" curto para caber), canvas no centro, ajustes à direita (histograma, abas, sliders). Os controles do preview (desfazer, zoom, divisor, grades, estouro, tela cheia, atalhos), o botão Exportar (canto superior direito) e o "Comparar com original" só aparecem com o mouse ou o foco sobre a foto (`group/stage`).

Listas longas (presets no editor, Meus presets, álbum) são reveladas em páginas por `lib/use-reveal.ts`: mostra as primeiras N (24, 30 e 20) e libera mais quando um sentinela perto do fim entra na área visível. Busca, categoria ou ordem nova volta para a primeira página. As telas `/app`, `/perfil` e `/presets` têm o contêiner que rola ocupando a largura toda e o conteúdo centralizado dentro dele (assim a barra de rolagem fica na borda da janela e os cards não encolhem).

Foto inexistente em `/editor/:id` (link de outra pessoa, outro aparelho, dados limpos) mostra `ui/photo-unavailable.tsx`: 404 explicando que a foto só vive no navegador de quem importou, com atalhos para o Estúdio e para restaurar backup. `PhotoNotFoundError` (em `photos/queries.ts`) separa "não existe" de falha real de leitura.

Identidade: o símbolo é a "rampa de exposição" (círculo em faixas que engrossam), um só para landing, barra do app e favicon. `ui/logo-mark.tsx` é o SVG inline (herda `currentColor`). Em `frontend/public/`: `favicon.svg` (claro/escuro via `prefers-color-scheme`, corte de 3 faixas para 16 a 48 px), `favicon.ico`, `apple-touch-icon.png`, `icon-192/512.png`, `maskable-512.png` (5 faixas, fundo `#0a0a0a`) e `site.webmanifest`.

Celular: empilhado (foto, faixa horizontal de presets, ajustes). Os controles do preview viram um menu de reticências sempre visível no canto superior esquerdo da foto; Exportar e Comparar ficam sempre visíveis.

Tela cheia: a foto ocupa tudo e nada fica visível por padrão. A barra do preview e o Comparar aparecem com o mouse na faixa inferior da tela. Exportar e o painel de ajustes (sobrepostos, 336px) aparecem com o mouse na borda direita. Teclado também revela (`:focus-visible`); o foco deixado por um clique de mouse não conta, por isso `focus-within` não é usado.

Código em `ui/photo-editor-view.tsx`, `ui/preset-strip.tsx` e `ui/preview-controls.tsx`.

## Fluxo de dados

- **Params do editor** vivem em `useRef`/objeto mutável e vão direto aos uniforms do shader. `useState` só para o que a UI exibe. Evita re-render a cada movimento de slider.
- **Salvar params** na foto com debounce de 500 ms.
- **TanStack Query** para tudo remoto ou do IndexedDB. Keys: `['presets','public']`, `['presets','user',userId]`, `['photos']`, `['photos',id]`.
- **Mutations de preset**: invalidação + update otimista.
- **Cache do Query** persistido no IndexedDB (`lib/query-persist.ts`, 7 dias): abre rápido e lê presets offline.

## Decisões não óbvias

- Um schema zod só (`editor/params.ts`) para UI, shader, validação de preset e backup.
- `geometry` (corte, giro, espelho, endireitar, tamanho final) vive na foto, **não** entra em preset nem na mistura de intensidade: preset muda cor, não enquadramento.
- Preset parcial é válido: cada campo tem default, então o seed guarda só o que difere.
- Um único filtro GLSL para preview, miniaturas e exportação: o resultado é idêntico nos três.
- Sem Zustand, sem react-hook-form: `useState` local.
- Motion (`motion/react`) com `reducedMotion="user"`. Nunca animar o que roda por frame no shader.
- Skeleton do editor (`editor-skeleton.tsx`): aparece já no primeiro quadro (nunca tela vazia) e fica pelo menos 1,5 s (`SKELETON_MIN_MS`) para a animação completa rodar inteira, mesmo com a foto em cache. Cores do skeleton vêm do token `--skeleton` (mais escuro que `--muted` no tema claro) e as bordas dos painéis usam `border-foreground/15`, para aparecerem nos dois temas. A rota do editor não força espera (`pendingMs: 150`, `pendingMinMs: 0`).
- `ui/enter.tsx` (`Enter`) é a entrada padrão das telas: sobe 12 px com fade, escalonada por índice (60 ms por posição, até 400 ms) ou ao rolar até o bloco (`inView`, usado nas seções da landing). Álbum, perfil, Meus presets e landing usam. Elemento com `layoutId` (anel do preset, marcador da navegação) nunca tem fundo: ver o guia no Notion.
- A navegação do topo tem Início, Estúdio e Perfil. "Meus presets" fica no menu do usuário.
- Tema escuro por padrão, classe `.dark` no `<html>`, sem flash. A troca usa o `AnimatedThemeToggler` do Magic UI (`components/ui/animated-theme-toggler.tsx`, View Transitions com círculo a partir do botão), em modo controlado: o `ThemeProvider` continua dono do tema e da persistência. O `ThemeToggle` (`ui/theme-toggle.tsx`) só o encaixa no visual do app.
- `components/ui/rainbow-button.tsx` (Magic UI): botão com borda e brilho arco-íris, usado no apoio do fim da landing via `DonateButton variant="rainbow"`. Cores `--color-1..5` e keyframe `rainbow` no `index.css`. Adaptado: sem `@radix-ui/react-slot` (o projeto usa Base UI), então não tem `asChild`. Registro `@magicui` já configurado em `components.json`.
