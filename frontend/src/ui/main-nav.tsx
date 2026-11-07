// Navegação principal: no desktop, links com marcador ativo que desliza entre itens; no celular, menu único.
import { Link, useRouterState } from '@tanstack/react-router'
import { Aperture, Home, type LucideIcon, Menu, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type Item = {
    to: '/' | '/app' | '/perfil'
    label: string
    icon: LucideIcon
}
const ITEMS: Item[] = [
    { to: '/', label: 'Início', icon: Home },
    { to: '/app', label: 'Estúdio', icon: Aperture },
    { to: '/perfil', label: 'Perfil', icon: UserRound },
]

// O editor de uma foto (/editor/:id) faz parte do Estúdio.
const isActive = (to: Item['to'], pathname: string) =>
    to === '/app' ? pathname === '/app' || pathname.startsWith('/editor') : pathname === to

export function MainNav() {
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const items = ITEMS
    return (
        <>
            <nav
                aria-label="Principal"
                className="bg-muted/40 ml-1 hidden items-center gap-0.5 rounded-full border p-0.5 md:flex"
            >
                {items.map(({ to, label, icon: Icon }) => {
                    const active = isActive(to, pathname)
                    return (
                        <Link
                            key={to}
                            to={to}
                            activeOptions={{ exact: true }}
                            aria-current={active ? 'page' : undefined}
                            className={`focus-visible:ring-ring/50 relative flex items-center gap-1.5 rounded-full px-3.5 py-1 text-sm outline-none transition-colors focus-visible:ring-3 ${
                                active
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {active && (
                                // Só anel, sem fundo: o Motion eleva o elemento compartilhado no deslize e um fundo taparia o texto dos itens por onde passa.
                                <motion.span
                                    layoutId="main-nav-active"
                                    className="ring-foreground/25 pointer-events-none absolute inset-0 z-20 rounded-full ring-1"
                                    style={{ borderRadius: 9999 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                                />
                            )}
                            <Icon className="relative size-4" />
                            <span className="relative">{label}</span>
                        </Link>
                    )
                })}
            </nav>
            <div className="md:hidden">
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={<Button size="icon-sm" variant="ghost" aria-label="Abrir menu" />}
                    >
                        <Menu />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={10} className="min-w-52 p-1.5">
                        {items.map(({ to, label, icon: Icon }) => (
                            <DropdownMenuItem
                                key={to}
                                className="gap-2.5 px-2.5 py-2 text-sm aria-[current=page]:bg-accent aria-[current=page]:font-medium"
                                render={
                                    <Link
                                        to={to}
                                        activeOptions={{ exact: true }}
                                        aria-current={isActive(to, pathname) ? 'page' : undefined}
                                    />
                                }
                            >
                                <Icon />
                                {label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    )
}
