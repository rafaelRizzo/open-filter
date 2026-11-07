---
description: Cria PR seguindo o padrão de commit do repo, calculando o bump de versão (major/minor/patch) esperado quando houver automação de release, antes de abrir a PR
---

Objetivo: abrir uma PR cujo título/corpo sigam o mesmo padrão dos commits do repo, e mostrar ao usuário qual bump de versão (major/minor/patch) o merge vai disparar (quando aplicável), antes de criar a PR.

## 1. Detectar regras de bump

Procure um workflow de release no repo (`.github/workflows/*.yml`/`*.yaml` com step de tag/release, ex: `release.yml`).

- **Se existir**: leia o arquivo e extraia dali as regras de classificação de commit → bump. Não hardcode: siga exatamente o que o workflow define (tipos que contam pra major/minor/patch, formato de tag, etc). Se o workflow mudar no futuro, a skill acompanha.
- **Se não existir**: use a regra padrão de Conventional Commits + SemVer:
  - `BREAKING CHANGE:` no body, ou `!` antes de `:` no header (ex: `feat!:`) → **major**
  - `^feat(\(escopo\))?:` → **minor**
  - `^fix(\(escopo\))?:` → **patch**
  - qualquer outro tipo → **não bumpa**
  - Avise o usuário que essa é a regra padrão assumida, já que o repo não define uma própria.

Bump final da PR = maior severidade encontrada entre os commits (major > minor > patch > nenhum).

## 2. Monorepo?

Antes de montar escopo no título, verifique se já está estabelecido na conversa (ou em CLAUDE.md/config do repo) se este projeto é monorepo (front+back no mesmo repo). Se não estiver claro, pergunte ao usuário com AskUserQuestion: "Este repositório é monorepo (front + back juntos)?" (Sim/Não).

- Se **for monorepo**: escopo no título e sufixo `(front|back)` nos bullets, como abaixo.
- Se **não for monorepo**: omita escopo do título e sufixo dos bullets em todo o resto desta skill.

## 3. Detectar branches e checar sincronismo

```bash
git branch --show-current                        # head
git status --short                                # deve estar limpo
git rev-parse HEAD; git rev-parse '@{u}' 2>&1     # HEAD deve == upstream
```

- Se `head` for a branch base (main/master), pare: não há o que abrir PR dela pra ela mesma.
- Base default: `main` (ou `master` se for o que o repo usa - confira `git branch -l main master` ou o default branch do `gh repo view`). Só pergunte outra base se o usuário pedir explicitamente.
- Se não houver upstream configurado ou `HEAD` != `@{u}` (branch local à frente/atrás do remoto), **pare e avise o usuário para dar push manualmente**. Esta skill nunca executa `git push`.

## 4. Coletar e classificar commits

```bash
git log --pretty=format:'%H%x00%s%x00%b%x1e' <base>..<head>
```

Para cada commit, aplique as regras do passo 1 no `%s` (subject) e `%b` (body) e extraia:
- tipo (`feat`, `fix`, `chore`, `ui`, `docs`, `refactor`, ...)
- escopo, se presente (e se for monorepo)
- descrição

Se não houver nenhum commit em `<base>..<head>`, avise e pare (nada a abrir).

## 5. Calcular versão (só se houver automação de release detectada no passo 1, ou se o repo usa tags `vX.Y.Z`)

```bash
git tag -l 'v*.*.*' --sort=-v:refname | head -n1
```

Aplique o bump calculado no passo 4 sobre essa tag (major zera minor+patch, minor zera patch, patch soma 1). Se não houver nenhuma tag e nenhuma automação de release, pule esta seção inteira (não invente versionamento que o repo não usa). Se bump = nenhum, sinalize no corpo da PR que o merge **não** vai gerar tag/release nova.

## 6. Montar título e corpo

**Escopo dominante** (só se monorepo): `full` se houver commits de mais de um escopo misturados; senão o escopo único presente; se nenhum commit tiver escopo, omita.

**Tipo dominante**: o tipo do commit de maior severidade (major > minor > patch); em empate, o mais frequente.

**Título** (máx 72 char, mesma regra de corte da skill `gerar-commit`):
```
<tipo>(<escopo>): <resumo curto, particípio passado>
```
(sem `(<escopo>)` se não for monorepo)

**Corpo**:
```markdown
## Mudanças

- <descrição 1, particípio passado> (front|back, se monorepo e aplicável)
- <descrição 2, particípio passado> (front|back, se monorepo e aplicável)
...
```
Se houver seção de versão (passo 5), adicione:
```markdown
## Versão

v<atual> → v<nova> (bump: <major|minor|patch>)
```
Se bump = nenhum: trocar a seção "Versão" por uma linha avisando que nenhum commit relevante foi encontrado, então a automação de release não vai criar tag nova.

Bullets: mesmo idioma dos commits do repo, particípio passado, ordenados do mais importante ao menos importante. Nunca invente mudança que não esteja no `git log` coletado.

## 7. Confirmar e criar

Mostre título + corpo + bump calculado (se aplicável) ao usuário. Pergunte via AskUserQuestion: "Abrir a PR agora?" (Sim / Não).

- Se **não**: pare aqui, título/corpo ficam prontos para o usuário copiar ou pedir ajuste.
- Se **sim**: confira `gh auth status`; se falhar ou `gh` não estiver instalado, avise e pare. Caso contrário:

```bash
gh pr create --base <base> --head <head> --title "<título>" --body "$(cat <<'EOF'
<corpo>
EOF
)"
```

Nunca rode `gh pr merge`. Nunca dê `git push`. Ao final, mostre a URL da PR retornada pelo `gh pr create`.
