// Rota raiz: layout, providers de UI, transição de página e toaster.
import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Link, Outlet, useRouterState } from '@tanstack/react-router'
import { MotionConfig, motion } from 'motion/react'
import type { AuthStore } from '@/auth/auth-store'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { LogoMark } from '@/ui/logo-mark'
import { MainNav } from '@/ui/main-nav'
import { NotFoundPage } from '@/ui/not-found-page'
import { ThemeToggle } from '@/ui/theme-toggle'
import { UserMenu } from '@/ui/user-menu'

export type RouterContext = { queryClient: QueryClient; auth: AuthStore }

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootLayout,
    notFoundComponent: NotFoundPage,
})

function RootLayout() {
    const pathname = useRouterState({ select: (s) => s.location.pathname })

    return (
        <MotionConfig reducedMotion="user">
            <TooltipProvider>
                <div className="flex h-dvh flex-col">
                    <a
                        href="#conteudo"
                        className="bg-background sr-only rounded-md border px-3 py-1.5 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
                    >
                        Pular para o conteúdo
                    </a>
                    <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-3">
                        <div className="flex items-center gap-2">
                            <Link
                                to="/"
                                className="focus-visible:ring-ring/50 mr-2 flex items-center gap-1.5 rounded-md text-sm font-semibold tracking-tight outline-none focus-visible:ring-3"
                            >
                                <LogoMark className="size-5" />
                                open-filter
                            </Link>
                            <MainNav />
                        </div>
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <UserMenu />
                        </div>
                    </header>
                    <main id="conteudo" className="relative min-h-0 flex-1">
                        {/* Só entrada, sem saída: com AnimatePresence o Outlet da rota que sai renderizaria a rota nova
                            (piscada). Um fade curto na troca basta e não deixa nada antigo montado. */}
                        <motion.div
                            key={pathname}
                            className="h-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.14 }}
                        >
                            <Outlet />
                        </motion.div>
                    </main>
                </div>
                <Toaster />
            </TooltipProvider>
        </MotionConfig>
    )
}
