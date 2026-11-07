// Links externos do projeto, vindos do ambiente (frontend/.env). Vazio = recurso não configurado.
const env = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined

export const REPO_URL = env(import.meta.env.VITE_REPO_URL)
