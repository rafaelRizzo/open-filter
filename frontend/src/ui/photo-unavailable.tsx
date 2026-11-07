// Tela de erro do editor: 404 explicado (foto só existe no navegador de quem importou) ou falha ao abrir.
import { Link } from '@tanstack/react-router'
import { HardDrive, ImageOff, Images, RotateCw, TriangleAlert, UserRound } from 'lucide-react'
import { motion } from 'motion/react'
import { buttonVariants } from '@/components/ui/button'
import { PhotoNotFoundError } from '@/photos/queries'

const REASONS = [
    { icon: UserRound, text: 'O link é de outra pessoa: as fotos não são compartilhadas.' },
    {
        icon: HardDrive,
        text: 'A foto foi importada em outro aparelho ou navegador (ou em aba anônima).',
    },
    { icon: Images, text: 'A foto foi excluída ou os dados do navegador foram limpos.' },
]

export function PhotoUnavailable({ error }: { error: unknown }) {
    const notFound = error instanceof PhotoNotFoundError
    const Icon = notFound ? ImageOff : TriangleAlert

    return (
        <div className="flex h-full items-center justify-center overflow-y-auto p-4 sm:p-6">
            <motion.div
                role="alert"
                className="flex w-full max-w-lg flex-col items-center gap-5 text-center"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <span className="bg-muted text-muted-foreground grid size-16 place-items-center rounded-2xl">
                    <Icon className="size-8" />
                </span>
                <div className="flex flex-col gap-2">
                    <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance">
                        {notFound
                            ? 'Essa foto não está neste navegador'
                            : 'Não foi possível abrir a foto'}
                    </h1>
                    <p className="text-muted-foreground text-pretty">
                        {notFound
                            ? 'No open-filter a edição acontece só no seu aparelho. A foto nunca vai para um servidor, então o endereço só funciona onde ela foi importada.'
                            : 'O navegador não conseguiu ler esta foto. Recarregar a página costuma resolver.'}
                    </p>
                </div>

                {notFound && (
                    <ul className="bg-card flex w-full flex-col gap-3 rounded-xl border p-4 text-left text-sm">
                        <li className="text-muted-foreground font-medium">
                            Isso costuma acontecer quando:
                        </li>
                        {REASONS.map(({ icon: ReasonIcon, text }) => (
                            <li key={text} className="flex items-start gap-3">
                                <ReasonIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                                <span>{text}</span>
                            </li>
                        ))}
                    </ul>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2">
                    <Link to="/app" className={buttonVariants({ size: 'lg' })}>
                        <Images />
                        Ir para o Estúdio
                    </Link>
                    {notFound ? (
                        <Link
                            to="/perfil"
                            className={buttonVariants({ variant: 'outline', size: 'lg' })}
                        >
                            Restaurar um backup
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className={buttonVariants({ variant: 'outline', size: 'lg' })}
                        >
                            <RotateCw />
                            Recarregar
                        </button>
                    )}
                </div>
                {notFound && (
                    <p className="text-muted-foreground text-xs text-pretty">
                        Para levar fotos entre aparelhos, faça um backup no Perfil e restaure no
                        outro.
                    </p>
                )}
            </motion.div>
        </div>
    )
}
