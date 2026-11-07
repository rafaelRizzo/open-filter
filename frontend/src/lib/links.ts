// Links externos do projeto, vindos do ambiente (frontend/.env). Vazio = recurso não configurado.
const env = (value: unknown) =>
    typeof value === 'string' && value.trim() ? value.trim() : undefined

export const REPO_URL = env(import.meta.env.VITE_REPO_URL)
/** Página de doação (GitHub Sponsors, Ko-fi, Apoia.se, Liberapay...). */
export const DONATE_URL = env(import.meta.env.VITE_DONATE_URL)
/** Chave Pix para doação (copiada para a área de transferência). */
export const PIX_KEY = env(import.meta.env.VITE_PIX_KEY)
