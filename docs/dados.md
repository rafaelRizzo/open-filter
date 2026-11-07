# Dados

## Fotos: IndexedDB (`photos/`)

Store `photos` via `idb`:

```
{ id, originalBlob, thumbnailBlob, name, width, height, params, updatedAt }
```

- Blob nunca em base64.
- **Entrada de fotos** (`photos/validate.ts`, `photos/limits.ts`): `accept` do seletor é só uma dica, então toda importação (botão, arrastar, restaurar backup) passa por `validateImageFile`: confere os bytes iniciais do arquivo (JPEG, PNG, WebP, AVIF, GIF ou BMP, não o nome nem o `type` declarado), o tamanho (máx. 100 MB) e os pixels lidos do cabeçalho (máx. 150 MP). O que não passa é recusado com a razão e nunca é gravado. A mutation `useImportPhoto` valida de novo (defesa em profundidade).
- **Limpeza automática:** `purgeInvalidPhotos` roda uma vez por sessão ao abrir o Estúdio e apaga do álbum o que não é imagem pelos bytes (arquivo trocado no IndexedDB, backup adulterado), avisando por toast. O editor também apaga a foto se ela não decodifica **e** não tem assinatura de imagem. Foto válida que só falhou ao decodificar (ex: pouca memória) nunca é apagada.
- `updatedAt` é a última atividade: muda ao salvar ajustes e também ao abrir a foto no editor (`touchPhoto`). O Estúdio usa isso para ordenar "Mais recentes" e para o card "Continuar de onde parou" (a foto com a atividade mais recente, escondido durante a busca).
- `navigator.storage.persist()` pedido e uso mostrado via `estimate()` (em `/perfil` e no medidor do Meu álbum, `ui/storage-meter.tsx`, com usados, livres e aviso a partir de 80% e 95%).
- Importar checa o espaço antes (`ui/use-import-files.ts`): se o espaço livre estimado for menor que 1,5x o tamanho dos arquivos, recusa com a mensagem de quanto falta e sugere excluir fotos ou fazer backup. Se mesmo assim a gravação estourar a cota (`QuotaExceededError`), o erro vira uma mensagem clara. A estimativa do navegador é aproximada.
- Limpar dados do navegador apaga as fotos: por isso existe o backup.

## Backup (`photos/backup.ts`, `photos/zip.ts`)

ZIP com as originais + `ajustes.json` (nome, medidas e params de cada foto). Na restauração o `ajustes.json` é validado com o `paramsSchema`. ZIP próprio, sem dependência.

## Supabase (`backend/`)

Só Auth (Google OAuth) e Postgres. Sem servidor próprio. Aplicar na ordem: `migrations/20261107120000_create_presets.sql`, depois `seed.sql`.

| Tabela | Acesso |
|---|---|
| `public_presets` | SELECT para todos (inclusive `anon`). Sem escrita para clientes (painel, SQL ou service role) |
| `user_presets` | SELECT/INSERT/UPDATE/DELETE só onde `user_id = auth.uid()`. Máximo de 10000 por usuário (trigger `enforce_user_presets_limit`, migration `20261107170000`; o front mostra "limite de filtros") |

Limites no banco: `name` até 50 caracteres e CHECK de tamanho em `params` (< 2048 bytes). O cliente valida com o zod do front, o banco é a segunda barreira. RLS ligado em toda tabela, `updated_at` por trigger, `user_id` com default `auth.uid()`.

`public_presets` tem `category` (migration `20261107150000`), usada pela UI para filtrar. Categorias atuais: Geral, Filme, Preto e branco, Anime, Cores e contraste, Dramático, Luz e clima, Cinema, Vintage, Lifestyle, Paisagem, Retrato, Urbano, Duotone, Baixa qualidade, Retro digital, Liminal, Dreamcore, Weirdcore, Glitch. Presets do usuário não têm categoria.

O seed é idempotente por nome: insere os que faltam e só atualiza categoria e ordem dos existentes (nunca sobrescreve `params`). Chaves e faixas dos params seguem `frontend/src/editor/params.ts`: se mudar o schema, revisar o seed.

## Presets (`presets/`)

- Preset = `{ id, name, params }`, params no formato `compactParams`.
- A faixa de presets mostra um Select de categoria ("Todas as categorias" + as da lista) e a busca age dentro da categoria escolhida.
- Aplicar preenche os sliders, com **intensidade** (`blendParams`, 0 = original, 1 = cheio).
- Salvar preset exige login. Sem login o app edita e exporta normalmente. Ao salvar no editor, o diálogo mostra uma barra de progresso com frases (`saving-progress.tsx`) até o Supabase responder, e fecha com "Pronto!".
- Editando um filtro pessoal (o aplicado, mesmo depois de mexer nos sliders), o Salvar pergunta: "Salvar no atual" (`updateUserPreset`, troca os params) ou "Criar novo". `basePresetId` em `photo-editor-view` guarda o filtro em edição; "Redefinir tudo" ou excluir o filtro encerram a edição.
- Botão direito num preset da aba "Meus" (editor) oferece "Copiar ID" e "Excluir" (com confirmação, `delete-preset-dialog.tsx`). Presets oficiais não podem ser excluídos.
- Presets do usuário vivem na nuvem; leitura offline pelo cache persistido do Query. O cache de presets pessoais é descartado (memória e IndexedDB) quando o dono não está mais logado: logout, sessão expirada ou troca de conta (`purgeForeignUserPresets` em `main.tsx`, rodado a cada mudança de sessão e depois de restaurar o cache do disco).
- `/presets`: criar, duplicar, renomear, excluir.

## Auth (`auth/`)

`supabase.auth.signInWithOAuth` (Google). A sessão fica no router context para loaders e guards (`/presets` exige login). Só a anon key no front.
