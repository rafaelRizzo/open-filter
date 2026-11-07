// "Novo preset" na página /presets: nome + os ajustes de uma foto do álbum (o enquadramento não entra).
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { isDefaultParams } from '@/editor/params'
import { useObjectUrl } from '@/lib/use-object-url'
import { cn } from '@/lib/utils'
import type { PhotoRecord } from '@/photos/db'
import { usePhotos } from '@/photos/queries'
import { PRESET_NAME_MAX, presetNameSchema } from '@/presets/api'
import { useCreatePreset } from '@/presets/queries'
import { Hint } from '@/ui/hint'

type Props = { userId: string; open: boolean; onOpenChange: (open: boolean) => void }

function PhotoChoice({
    photo,
    selected,
    onSelect,
}: {
    photo: PhotoRecord
    selected: boolean
    onSelect: () => void
}) {
    const url = useObjectUrl(photo.thumbnailBlob)
    const plain = isDefaultParams(photo.params)
    return (
        // biome-ignore lint/a11y/useSemanticElements: botão com role=radio e aria-checked, navegado por Tab e Enter
        <button
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                'focus-visible:ring-ring/50 flex flex-col gap-1 rounded-lg border p-1 text-left text-xs outline-none focus-visible:ring-3',
                selected ? 'border-foreground bg-accent' : 'hover:bg-accent/50',
            )}
        >
            <span className="bg-muted block aspect-square overflow-hidden rounded-md">
                {url && <img src={url} alt="" className="size-full object-cover" />}
            </span>
            <Hint label={photo.name}>
                <span className="truncate">{photo.name}</span>
            </Hint>
            <span className="text-muted-foreground">{plain ? 'sem ajustes' : 'com ajustes'}</span>
        </button>
    )
}

function NewPresetForm({ userId, onClose }: { userId: string; onClose: () => void }) {
    const photos = usePhotos()
    const create = useCreatePreset(userId)
    const [name, setName] = useState('')
    const [photoId, setPhotoId] = useState<string | null>(null)

    const photo = photos.data?.find((p) => p.id === photoId)
    const check = presetNameSchema.safeParse(name)
    const plain = photo ? isDefaultParams(photo.params) : false
    const nameError = name.length > 0 && !check.success ? check.error.issues[0]?.message : undefined
    const canSave = check.success && !!photo && !plain

    const submit = () => {
        if (!canSave || !photo) return
        create.mutate(
            { name: check.data, params: photo.params },
            {
                onSuccess: () => toast.success('Preset criado'),
                onError: (e) =>
                    toast.error(e instanceof Error ? e.message : 'Não foi possível criar o preset'),
            },
        )
        onClose()
    }

    return (
        <form
            className="contents"
            onSubmit={(e) => {
                e.preventDefault()
                submit()
            }}
        >
            <DialogHeader>
                <DialogTitle>Novo preset</DialogTitle>
                <DialogDescription>
                    Escolha uma foto do álbum: os ajustes dela viram o preset. Corte e giro não
                    entram.
                </DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <Label htmlFor="new-preset-name">Nome</Label>
                    <Input
                        id="new-preset-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={!!nameError}
                        placeholder="Ex: Pôr do sol"
                    />
                    <div className="flex justify-between text-xs">
                        <span className="text-destructive">{nameError}</span>
                        <span className="text-muted-foreground tabular-nums">
                            {name.trim().length}/{PRESET_NAME_MAX}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">Ajustes de qual foto?</span>
                    {photos.isPending && (
                        <p className="text-muted-foreground text-sm">Carregando o álbum...</p>
                    )}
                    {photos.data?.length === 0 && (
                        <p className="text-muted-foreground text-sm">
                            Seu álbum está vazio. Importe uma foto no{' '}
                            <Link
                                to="/app"
                                className="underline underline-offset-2"
                                onClick={onClose}
                            >
                                Estúdio
                            </Link>
                            , ajuste e volte aqui.
                        </p>
                    )}
                    {photos.data && photos.data.length > 0 && (
                        <div
                            role="radiogroup"
                            aria-label="Foto de origem"
                            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
                        >
                            {photos.data.map((p) => (
                                <PhotoChoice
                                    key={p.id}
                                    photo={p}
                                    selected={p.id === photoId}
                                    onSelect={() => setPhotoId(p.id)}
                                />
                            ))}
                        </div>
                    )}
                    {plain && (
                        <p className="text-destructive text-xs">
                            Essa foto não tem ajustes para salvar. Escolha outra.
                        </p>
                    )}
                </div>
            </DialogBody>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={!canSave || create.isPending}>
                    Criar preset
                </Button>
            </DialogFooter>
        </form>
    )
}

export function NewPresetDialog({ userId, open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                {/* O formulário só monta com o diálogo aberto: abrir de novo começa limpo. */}
                {open && <NewPresetForm userId={userId} onClose={() => onOpenChange(false)} />}
            </DialogContent>
        </Dialog>
    )
}
