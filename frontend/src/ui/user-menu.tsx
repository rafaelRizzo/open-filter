// Menu da conta no header: "Entrar com Google" para visitante, avatar com menu para quem está logado.
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Bookmark, LogIn, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { signInWithGoogle, signOut } from '@/auth/auth-store'
import { useSession } from '@/auth/use-session'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { persister } from '@/lib/query-persist'

const initials = (text: string) => text.trim().charAt(0).toUpperCase() || '?'

export function UserMenu() {
    const session = useSession()
    const qc = useQueryClient()
    const navigate = useNavigate()

    if (!session) {
        return (
            <Button
                size="sm"
                variant="outline"
                aria-label="Entrar com Google"
                onClick={() => signInWithGoogle().catch((e: Error) => toast.error(e.message))}
            >
                <LogIn data-icon="inline-start" />
                <span className="sm:hidden">Entrar</span>
                <span className="hidden sm:inline">Entrar com Google</span>
            </Button>
        )
    }

    const email = session.user.email ?? 'Conta'
    const avatar = session.user.user_metadata?.avatar_url as string | undefined
    const name = (session.user.user_metadata?.full_name as string | undefined) ?? email

    const logout = async () => {
        try {
            const revoked = await signOut()
            // Presets pessoais não podem sobrar no cache (nem no persistido) para o próximo visitante.
            qc.removeQueries({ queryKey: ['presets', 'user'] })
            await persister.removeClient()
            await navigate({ to: '/' })
            if (!revoked)
                toast.info(
                    'Você saiu neste aparelho. Sem conexão, a sessão no servidor só expira sozinha.',
                )
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível sair')
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={<Button size="sm" variant="ghost" aria-label="Menu da conta" />}
            >
                {avatar ? (
                    <img
                        src={avatar}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="size-5 rounded-full"
                    />
                ) : (
                    <span className="bg-muted flex size-5 items-center justify-center rounded-full text-xs">
                        {initials(name)}
                    </span>
                )}
                <span className="hidden max-w-32 truncate sm:inline">{name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {/* Base UI: o rótulo do menu precisa estar dentro de um Group, senão o menu inteiro quebra. */}
                <DropdownMenuGroup>
                    <DropdownMenuLabel className="whitespace-nowrap">{email}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem render={<Link to="/presets" />}>
                        <Bookmark />
                        Meus presets
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                        <LogOut />
                        Sair
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
