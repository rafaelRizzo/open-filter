// Estúdio: importar foto e "Meu álbum" com as fotos salvas neste navegador.
import { createFileRoute } from '@tanstack/react-router'
import { LogIn } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { signInWithGoogle } from '@/auth/auth-store'
import { Button } from '@/components/ui/button'
import { Album } from '@/ui/album'
import { Enter } from '@/ui/enter'
import { ImportButton } from '@/ui/import-button'
import { PhotoDropZone } from '@/ui/photo-drop-zone'

export const Route = createFileRoute('/app')({
    // `entrar` vem do guard de /presets: mostra o convite para entrar.
    validateSearch: (search: Record<string, unknown>): { entrar?: boolean } =>
        search.entrar === true || search.entrar === 'true' ? { entrar: true } : {},
    component: StudioPage,
})

function StudioPage() {
    const { entrar } = Route.useSearch()

    return (
        <PhotoDropZone className="h-full overflow-y-auto">
            <div className="mx-auto flex max-w-5xl flex-col gap-10 p-4 sm:p-6 lg:py-10">
                <motion.section
                    className="flex flex-col items-start gap-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex flex-col gap-2">
                        <h1 className="font-heading text-4xl font-semibold tracking-tight">
                            Estúdio
                        </h1>
                        <p className="text-muted-foreground max-w-2xl text-pretty">
                            Escolha uma foto para começar. Ela fica só neste navegador e nunca vai
                            para um servidor.
                        </p>
                    </div>
                    {entrar && (
                        <div
                            className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-3 pl-4 text-sm"
                            role="status"
                        >
                            <span>Entre com o Google para ver e salvar seus presets pessoais.</span>
                            <Button
                                size="sm"
                                onClick={() =>
                                    signInWithGoogle('/presets').catch((e: Error) =>
                                        toast.error(e.message),
                                    )
                                }
                            >
                                <LogIn data-icon="inline-start" />
                                Entrar com Google
                            </Button>
                        </div>
                    )}
                    <ImportButton />
                </motion.section>
                <Enter i={2}>
                    <Album />
                </Enter>
            </div>
        </PhotoDropZone>
    )
}
