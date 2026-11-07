// Hook da sessão atual (null = visitante). Re-renderiza quando o login muda.
import type { Session } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import { authStore } from './auth-store'

export const useSession = (): Session | null =>
    useSyncExternalStore(authStore.subscribe, authStore.snapshot)
