// "Salvar como preset": pede um nome (até 50 caracteres) e grava só o que difere do padrão.
// Se a edição parte de um filtro pessoal, oferece atualizar esse filtro ou criar um novo.
import { LogIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { signInWithGoogle } from '@/auth/auth-store'
import { useSession } from '@/auth/use-session'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { EditParams } from '@/editor/params'
import { PRESET_NAME_MAX, type Preset, presetNameSchema } from '@/presets/api'
import { useCreatePreset, useUpdatePreset } from '@/presets/queries'
import { SavingProgress } from './saving-progress'

// Tempo para o "Pronto!" aparecer antes de fechar.
const DONE_DELAY_MS = 600

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    getParams: () => EditParams
    onSaved: (preset: Preset) => void
    /** Filtro pessoal que está sendo editado (null: ajustes soltos ou partindo de preset oficial). */
    base: Preset | null
}

export function SavePresetDialog({ open, onOpenChange, getParams, onSaved, base }: Props) {
    const session = useSession()
    const [wantsNew, setWantsNew] = useState(false)
    // Cada abertura recomeça perguntando (se houver filtro base).
    useEffect(() => {
        if (open) setWantsNew(false)
    }, [open])
    const choosing = !!session && !!base && !wantsNew

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{choosing ? 'Salvar filtro' : 'Salvar como preset'}</DialogTitle>
                    <DialogDescription>
                        {choosing
                            ? `Você está editando o seu filtro "${base?.name}".`
                            : session
                              ? 'Guarda os ajustes atuais na sua conta para usar em qualquer foto.'
                              : 'Presets pessoais ficam na sua conta. Entre com o Google para salvar.'}
                    </DialogDescription>
                </DialogHeader>
                {session && choosing && base ? (
                    <UpdateChoice
                        userId={session.user.id}
                        base={base}
                        getParams={getParams}
                        onSaved={onSaved}
                        onClose={() => onOpenChange(false)}
                        onCreateNew={() => setWantsNew(true)}
                    />
                ) : session ? (
                    <SaveForm
                        userId={session.user.id}
                        getParams={getParams}
                        onSaved={onSaved}
                        onClose={() => onOpenChange(false)}
                    />
                ) : (
                    <DialogFooter>
                        <Button
                            onClick={() =>
                                signInWithGoogle().catch((e: Error) => toast.error(e.message))
                            }
                        >
                            <LogIn data-icon="inline-start" />
                            Entrar com Google
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}

function UpdateChoice({
    userId,
    base,
    getParams,
    onSaved,
    onClose,
    onCreateNew,
}: {
    userId: string
    base: Preset
    getParams: () => EditParams
    onSaved: (preset: Preset) => void
    onClose: () => void
    onCreateNew: () => void
}) {
    const update = useUpdatePreset(userId)
    const [saved, setSaved] = useState(false)
    const busy = update.isPending || saved

    const submit = async () => {
        try {
            const preset = await update.mutateAsync({ id: base.id, params: getParams() })
            setSaved(true)
            toast.success('Filtro atualizado')
            onSaved(preset)
            await new Promise((resolve) => setTimeout(resolve, DONE_DELAY_MS))
            onClose()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar o filtro')
        }
    }

    return (
        <>
            <DialogBody>
                <div className="flex flex-col gap-3">
                    <p className="text-muted-foreground text-sm">
                        Quer salvar as novas configurações nele, trocando o que estava salvo, ou
                        criar um filtro novo e manter o atual como está?
                    </p>
                    {busy && <SavingProgress done={saved} />}
                </div>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" disabled={busy} onClick={onCreateNew}>
                    Criar novo
                </Button>
                <Button type="button" disabled={busy} onClick={() => void submit()}>
                    {saved ? 'Salvo' : update.isPending ? 'Salvando...' : 'Salvar no atual'}
                </Button>
            </DialogFooter>
        </>
    )
}

function SaveForm({
    userId,
    getParams,
    onSaved,
    onClose,
}: {
    userId: string
    getParams: () => EditParams
    onSaved: (preset: Preset) => void
    onClose: () => void
}) {
    const [name, setName] = useState('')
    const create = useCreatePreset(userId)
    const [saved, setSaved] = useState(false)
    const busy = create.isPending || saved
    const check = presetNameSchema.safeParse(name)
    const error = name.length > 0 && !check.success ? check.error.issues[0]?.message : undefined

    const submit = async () => {
        if (!check.success) return
        try {
            const preset = await create.mutateAsync({ name: check.data, params: getParams() })
            setSaved(true)
            toast.success('Preset salvo')
            onSaved(preset)
            await new Promise((resolve) => setTimeout(resolve, DONE_DELAY_MS))
            onClose()
        } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Não foi possível salvar o preset')
        }
    }

    return (
        <form
            className="contents"
            onSubmit={(e) => {
                e.preventDefault()
                void submit()
            }}
        >
            <DialogBody>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="preset-name">Nome</Label>
                    <Input
                        id="preset-name"
                        autoFocus
                        value={name}
                        disabled={busy}
                        maxLength={PRESET_NAME_MAX + 20}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={!!error}
                        placeholder="Ex: Pôr do sol"
                    />
                    <div className="flex justify-between text-xs">
                        <span className="text-destructive" role={error ? 'alert' : undefined}>
                            {error}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {name.trim().length}/{PRESET_NAME_MAX}
                        </span>
                    </div>
                    {busy && <SavingProgress done={saved} />}
                </div>
            </DialogBody>
            <DialogFooter>
                <Button type="submit" disabled={!check.success || busy}>
                    {saved ? 'Salvo' : create.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
            </DialogFooter>
        </form>
    )
}
