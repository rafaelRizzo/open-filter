// Tela /presets: lista os presets pessoais com busca, renomear e excluir (com confirmação).
import { Bookmark, CircleAlert, Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/auth/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'
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
import { Skeleton } from '@/components/ui/skeleton'
import { PARAM_KEYS } from '@/editor/params'
import { copyText } from '@/lib/clipboard'
import { useReveal } from '@/lib/use-reveal'
import { filterPresets, PRESET_NAME_MAX, type Preset, presetNameSchema } from '@/presets/api'
import { useCreatePreset, useRenamePreset, useUserPresets } from '@/presets/queries'
import { Enter } from '@/ui/enter'
import { Hint } from '@/ui/hint'
import { DeletePresetDialog } from './delete-preset-dialog'
import { NewPresetDialog } from './new-preset-dialog'

const PAGE_SIZE = 30

const adjusted = (preset: Preset) => {
    const base = PARAM_KEYS.filter((k) => preset.params[k] !== (k === 'lutStrength' ? 1 : 0)).length
    return base
}

export function MyPresetsPage() {
    const session = useSession()
    const userId = session?.user.id
    const presets = useUserPresets(userId)
    const [query, setQuery] = useState('')
    const [renaming, setRenaming] = useState<Preset | null>(null)
    const [deleting, setDeleting] = useState<Preset | null>(null)
    const [creating, setCreating] = useState(false)
    const duplicate = useCreatePreset(userId ?? '')
    const visible = useMemo(() => filterPresets(presets.data ?? [], query), [presets.data, query])

    const { shown, hasMore, sentinelRef } = useReveal(visible, PAGE_SIZE, query)

    if (!userId) return null

    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4 sm:p-6 lg:py-10">
                <Enter className="flex items-center justify-between gap-3">
                    <h1 className="font-heading flex items-center gap-2 text-4xl font-semibold tracking-tight">
                        <Bookmark className="size-6" />
                        Meus presets
                        {presets.data && presets.data.length > 0 && (
                            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-normal tabular-nums">
                                {presets.data.length}
                            </span>
                        )}
                    </h1>
                    <Button onClick={() => setCreating(true)}>
                        <Plus data-icon="inline-start" />
                        Novo preset
                    </Button>
                </Enter>
                <Enter i={1} className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        maxLength={512}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar por nome ou ID"
                        aria-label="Buscar preset por nome ou ID"
                        className="pl-8"
                    />
                </Enter>

                {presets.isPending && (
                    <div className="flex flex-col gap-2">
                        {[0, 1, 2].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-xl" />
                        ))}
                    </div>
                )}
                {presets.isError && (
                    <div
                        role="alert"
                        className="border-destructive/40 text-destructive flex items-center gap-2 rounded-xl border p-4 text-sm"
                    >
                        <CircleAlert className="size-4 shrink-0" />
                        {presets.error.message}
                    </div>
                )}
                {presets.data && presets.data.length === 0 && (
                    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center text-sm">
                        <Bookmark className="size-6" />
                        <p className="max-w-sm text-pretty">
                            Você ainda não salvou presets. Ajuste uma foto e use "Salvar como
                            preset" no editor, ou crie um aqui.
                        </p>
                    </div>
                )}
                {presets.data && presets.data.length > 0 && visible.length === 0 && (
                    <p className="text-muted-foreground py-10 text-center text-sm">
                        Nenhum preset encontrado.
                    </p>
                )}

                <ul className="flex flex-col gap-2">
                    {shown.map((preset, i) => (
                        <Enter as="li" key={preset.id} i={i % PAGE_SIZE}>
                            <ContextMenu>
                                <ContextMenuTrigger render={<div />}>
                                    <Card size="sm">
                                        <CardContent className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">
                                                    {preset.name}
                                                </p>
                                                <p className="text-muted-foreground truncate text-xs">
                                                    {adjusted(preset)}{' '}
                                                    {adjusted(preset) === 1 ? 'ajuste' : 'ajustes'}{' '}
                                                    ·{' '}
                                                    {preset.id.startsWith('temp-')
                                                        ? 'salvando...'
                                                        : preset.id.slice(0, 8)}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <Hint label="Duplicar" wrap>
                                                    <Button
                                                        size="icon-sm"
                                                        variant="ghost"
                                                        aria-label={`Duplicar ${preset.name}`}
                                                        disabled={preset.id.startsWith('temp-')}
                                                        onClick={() =>
                                                            duplicate.mutate(
                                                                {
                                                                    name: `${preset.name.slice(0, PRESET_NAME_MAX - 8)} (cópia)`,
                                                                    params: preset.params,
                                                                },
                                                                {
                                                                    onSuccess: () =>
                                                                        toast.success(
                                                                            'Preset duplicado',
                                                                        ),
                                                                    onError: (e) =>
                                                                        toast.error(
                                                                            e instanceof Error
                                                                                ? e.message
                                                                                : 'Não foi possível duplicar',
                                                                        ),
                                                                },
                                                            )
                                                        }
                                                    >
                                                        <Copy />
                                                    </Button>
                                                </Hint>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    aria-label={`Renomear ${preset.name}`}
                                                    onClick={() => setRenaming(preset)}
                                                >
                                                    <Pencil />
                                                </Button>
                                                <Button
                                                    size="icon-sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    aria-label={`Excluir ${preset.name}`}
                                                    onClick={() => setDeleting(preset)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </ContextMenuTrigger>
                                <ContextMenuContent>
                                    <ContextMenuItem
                                        disabled={preset.id.startsWith('temp-')}
                                        onClick={() => copyText(preset.id, 'ID copiado')}
                                    >
                                        <Copy />
                                        Copiar ID
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => setRenaming(preset)}>
                                        <Pencil />
                                        Renomear
                                    </ContextMenuItem>
                                    <ContextMenuItem
                                        variant="destructive"
                                        onClick={() => setDeleting(preset)}
                                    >
                                        <Trash2 />
                                        Excluir
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        </Enter>
                    ))}
                </ul>
                {hasMore && <div ref={sentinelRef} aria-hidden className="h-px shrink-0" />}

                <NewPresetDialog userId={userId} open={creating} onOpenChange={setCreating} />
                <RenameDialog userId={userId} preset={renaming} onClose={() => setRenaming(null)} />
                <DeletePresetDialog
                    userId={userId}
                    preset={deleting}
                    onClose={() => setDeleting(null)}
                />
            </div>
        </div>
    )
}

function RenameDialog({
    userId,
    preset,
    onClose,
}: {
    userId: string
    preset: Preset | null
    onClose: () => void
}) {
    return (
        <Dialog open={!!preset} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                {preset && (
                    <RenameForm key={preset.id} userId={userId} preset={preset} onClose={onClose} />
                )}
            </DialogContent>
        </Dialog>
    )
}

function RenameForm({
    userId,
    preset,
    onClose,
}: {
    userId: string
    preset: Preset
    onClose: () => void
}) {
    const [name, setName] = useState(preset.name)
    const rename = useRenamePreset(userId)
    const check = presetNameSchema.safeParse(name)

    return (
        <form
            className="contents"
            onSubmit={(e) => {
                e.preventDefault()
                if (!check.success) return
                rename.mutate(
                    { id: preset.id, name: check.data },
                    {
                        onError: (err) =>
                            toast.error(
                                err instanceof Error ? err.message : 'Não foi possível renomear',
                            ),
                        onSuccess: () => toast.success('Preset renomeado'),
                    },
                )
                onClose()
            }}
        >
            <DialogHeader>
                <DialogTitle>Renomear preset</DialogTitle>
                <DialogDescription>Até {PRESET_NAME_MAX} caracteres.</DialogDescription>
            </DialogHeader>
            <DialogBody>
                <Input
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-label="Novo nome"
                    aria-invalid={!check.success}
                />
                {!check.success && (
                    <p className="text-destructive pt-1 text-xs">
                        {check.error.issues[0]?.message}
                    </p>
                )}
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!check.success}>
                    Salvar
                </Button>
            </DialogFooter>
        </form>
    )
}
