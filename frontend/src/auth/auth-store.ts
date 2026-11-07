// Sessão do Supabase como store externo: o router lê no contexto (guards) e a UI via useSession.
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export type AuthStore = {
    /** Espera o Supabase terminar de processar o retorno do OAuth (hash/code na URL) antes de responder. */
    getSession: () => Promise<Session | null>
    snapshot: () => Session | null
    subscribe: (listener: () => void) => () => void
}

export const createAuthStore = (): AuthStore => {
    let session: Session | null = null
    const listeners = new Set<() => void>()

    const ready = supabase.auth.getSession().then(({ data }) => {
        session = data.session
    })

    supabase.auth.onAuthStateChange((_event, next) => {
        session = next
        for (const l of listeners) l()
    })

    return {
        getSession: async () => {
            // Sem timeout, um lock do GoTrue preso ou refresh lento deixava a rota preta; vence "sem sessão".
            await Promise.race([ready, new Promise<void>((r) => setTimeout(r, 4000))])
            return session
        },
        snapshot: () => session,
        subscribe: (listener) => {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}

export const authStore = createAuthStore()

/** Login com Google. `returnTo` é o caminho para onde o usuário volta depois do OAuth. */
export const signInWithGoogle = async (returnTo: string = window.location.pathname) => {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${returnTo}` },
    })
    if (error) throw new Error('Não foi possível iniciar o login com Google')
}

/**
 * Sai da conta. Tenta encerrar a sessão no servidor (até 4s) e, de um jeito ou de outro, remove a sessão
 * deste aparelho: sem internet o pedido global ficava pendente e o usuário continuava logado.
 * Devolve false quando o servidor não confirmou (a sessão dele só expira sozinha).
 */
export const signOut = async (): Promise<boolean> => {
    const server = supabase.auth
        .signOut()
        .then(({ error }) => !error)
        .catch(() => false)
    const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 4000))
    const revoked = await Promise.race([server, timeout])
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw new Error('Não foi possível sair')
    return revoked
}
