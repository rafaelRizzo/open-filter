// Entrada do app: cache persistido (IndexedDB), tema e router com queryClient e sessão no context.
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { authStore } from '@/auth/auth-store'
import { PERSIST_MAX_AGE, persister, shouldPersist } from '@/lib/query-persist'
import { ThemeProvider } from '@/lib/theme'
import { routeTree } from './routeTree.gen'
import './index.css'

const queryClient = new QueryClient({
    defaultOptions: {
        // gcTime >= maxAge do persister, senão o cache restaurado seria descartado antes de valer.
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            gcTime: PERSIST_MAX_AGE,
        },
    },
})

const router = createRouter({
    routeTree,
    context: { queryClient, auth: authStore },
    defaultPreload: 'intent',
    // Mostra algo já no primeiro instante em vez de tela preta enquanto loaders e chunks resolvem.
    defaultPendingMs: 0,
    defaultPendingMinMs: 300,
    defaultPendingComponent: () => (
        <div
            className="flex h-full items-center justify-center"
            role="status"
            aria-label="Carregando"
        >
            <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
        </div>
    ),
})

// Presets pessoais só ficam no cache (memória e IndexedDB) enquanto o dono estiver logado. Cobre logout,
// sessão que expira sozinha e troca de conta no mesmo navegador (computador compartilhado).
const purgeForeignUserPresets = () => {
    const userId = authStore.snapshot()?.user.id
    queryClient.removeQueries({
        queryKey: ['presets', 'user'],
        predicate: (query) => query.queryKey[2] !== userId,
    })
}

// Login e logout revalidam os guards e loaders das rotas.
authStore.subscribe(() => {
    purgeForeignUserPresets()
    void router.invalidate()
})

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

// Imagens e links não são arrastáveis (o navegador criaria um "fantasma" da miniatura). Arrastar arquivos
// de fora para importar não é afetado: isso dispara dragover/drop, não dragstart.
document.addEventListener('dragstart', (e) => {
    if (e.target instanceof HTMLImageElement || e.target instanceof HTMLAnchorElement)
        e.preventDefault()
})

const root = document.getElementById('root')
if (!root) throw new Error('#root não encontrado')

createRoot(root).render(
    <StrictMode>
        <ThemeProvider>
            <PersistQueryClientProvider
                client={queryClient}
                persistOptions={{
                    persister,
                    maxAge: PERSIST_MAX_AGE,
                    buster: 'v1',
                    dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
                }}
                // Depois de restaurar o cache do disco: descarta o que sobrou de quem não está logado agora.
                onSuccess={() => void authStore.getSession().then(purgeForeignUserPresets)}
            >
                <RouterProvider router={router} />
            </PersistQueryClientProvider>
        </ThemeProvider>
    </StrictMode>,
)
