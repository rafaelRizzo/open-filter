// Página 404 geral: mostra o endereço tentado e leva de volta para as telas principais.
import { Link, useRouterState } from '@tanstack/react-router'
import { Compass, House, Images } from 'lucide-react'
import { motion } from 'motion/react'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
    const pathname = useRouterState({ select: (s) => s.location.pathname })

    return (
        <div className="flex h-full items-center justify-center overflow-y-auto p-4 sm:p-6">
            <motion.div
                className="flex w-full max-w-lg flex-col items-center gap-5 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <span className="bg-muted text-muted-foreground grid size-16 place-items-center rounded-2xl">
                    <Compass className="size-8" />
                </span>
                <div className="flex flex-col gap-2">
                    <p className="text-muted-foreground font-mono text-sm tracking-widest">404</p>
                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
                        Página não encontrada
                    </h1>
                    <p className="text-muted-foreground text-pretty">
                        O endereço não existe ou mudou de lugar. Confira se ele foi digitado certo
                        ou volte para uma das telas abaixo.
                    </p>
                </div>

                <code className="bg-card text-muted-foreground max-w-full truncate rounded-lg border px-3 py-1.5 font-mono text-xs">
                    {pathname}
                </code>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link to="/app" className={buttonVariants({ size: 'lg' })}>
                        <Images />
                        Ir para o Estúdio
                    </Link>
                    <Link to="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                        <House />
                        Voltar ao início
                    </Link>
                </div>
            </motion.div>
        </div>
    )
}
