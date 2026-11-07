// "Meu álbum": grade das fotos salvas no navegador, com busca por nome, ordenação e excluir confirmado.

import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, CircleAlert, ImagePlus, Images, Search, SearchX, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useObjectUrl } from '@/lib/use-object-url'
import { useReveal } from '@/lib/use-reveal'
import type { PhotoRecord } from '@/photos/db'
import { useDeletePhoto, usePhotos } from '@/photos/queries'
import { purgeInvalidPhotos } from '@/photos/validate'
import { Enter } from '@/ui/enter'
import { Hint } from '@/ui/hint'
import { StorageMeter } from '@/ui/storage-meter'

const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })

// Foto com a atividade mais recente (aberta ou editada por último): atalho para voltar a ela.
function ContinueCard({ photo }: { photo: PhotoRecord }) {
    const url = useObjectUrl(photo.thumbnailBlob)
    return (
        <Enter i={1}>
            <Link
                to="/editor/$photoId"
                params={{ photoId: photo.id }}
                className="focus-visible:ring-ring/50 bg-card hover:border-ring/50 group flex items-center gap-4 rounded-2xl border p-3 outline-none transition-colors focus-visible:ring-3"
            >
                <div className="bg-muted size-20 shrink-0 overflow-hidden rounded-xl sm:size-24">
                    {url && <img src={url} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        Continuar de onde parou
                    </p>
                    <p className="truncate font-medium">{photo.name}</p>
                    <p className="text-muted-foreground text-xs">
                        Última atividade em {formatDate(photo.updatedAt)}
                    </p>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1 pr-1 text-sm transition-colors max-sm:hidden">
                    Abrir
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
            </Link>
        </Enter>
    )
}

function AlbumItem({
    photo,
    index,
    onDelete,
}: {
    photo: PhotoRecord
    index: number
    onDelete: (p: PhotoRecord) => void
}) {
    const url = useObjectUrl(photo.thumbnailBlob)
    return (
        <Enter as="li" i={index} className="group relative">
            <Link
                to="/editor/$photoId"
                params={{ photoId: photo.id }}
                className="focus-visible:ring-ring/50 bg-card hover:border-ring/50 block overflow-hidden rounded-xl border outline-none transition-colors focus-visible:ring-3"
            >
                <div className="bg-muted aspect-square overflow-hidden">
                    {url && (
                        <img
                            src={url}
                            alt={photo.name}
                            className="size-full object-cover transition-transform motion-reduce:transition-none group-hover:scale-105"
                        />
                    )}
                </div>
                <div className="px-2 py-1.5">
                    <Hint label={photo.name}>
                        <p className="truncate text-sm">{photo.name}</p>
                    </Hint>
                    <p className="text-muted-foreground text-xs">{formatDate(photo.updatedAt)}</p>
                </div>
            </Link>
            <Button
                size="icon-sm"
                variant="destructive"
                aria-label={`Excluir ${photo.name}`}
                className="absolute top-1.5 right-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 max-sm:opacity-100"
                onClick={() => onDelete(photo)}
            >
                <Trash2 />
            </Button>
        </Enter>
    )
}

// 4 linhas de 5 por página.
const PAGE_SIZE = 20

// Uma varredura por sessão: itens do IndexedDB que não são imagem (arquivo trocado, backup adulterado) saem do álbum.
let purgedThisSession = false

type SortKey = 'recent' | 'oldest' | 'name-asc' | 'name-desc'
const SORTS: { value: SortKey; label: string }[] = [
    { value: 'recent', label: 'Mais recentes' },
    { value: 'oldest', label: 'Mais antigas' },
    { value: 'name-asc', label: 'Nome (A a Z)' },
    { value: 'name-desc', label: 'Nome (Z a A)' },
]

// Busca sem acento e sem caixa, igual à dos presets.
const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

const compare: Record<SortKey, (a: PhotoRecord, b: PhotoRecord) => number> = {
    recent: (a, b) => b.updatedAt - a.updatedAt,
    oldest: (a, b) => a.updatedAt - b.updatedAt,
    'name-asc': (a, b) => a.name.localeCompare(b.name, 'pt-BR', { numeric: true }),
    'name-desc': (a, b) => b.name.localeCompare(a.name, 'pt-BR', { numeric: true }),
}

export function Album() {
    const photos = usePhotos()
    const qc = useQueryClient()
    useEffect(() => {
        if (purgedThisSession) return
        purgedThisSession = true
        purgeInvalidPhotos()
            .then((removed) => {
                if (removed === 0) return
                toast.warning(
                    `${removed} ${removed === 1 ? 'item que não era imagem foi removido' : 'itens que não eram imagem foram removidos'} do álbum`,
                )
                return qc.invalidateQueries({ queryKey: ['photos'] })
            })
            .catch(() => toast.error('Não foi possível verificar o álbum'))
    }, [qc])
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState<SortKey>('recent')
    const visible = useMemo(() => {
        const q = normalize(query.trim())
        const list = (photos.data ?? []).filter((p) => !q || normalize(p.name).includes(q))
        return list.sort(compare[sort])
    }, [photos.data, query, sort])
    // Busca ou ordem nova volta para a primeira página.
    const { shown, hasMore, sentinelRef } = useReveal(visible, PAGE_SIZE, `${query}|${sort}`)
    const del = useDeletePhoto()
    const [deleting, setDeleting] = useState<PhotoRecord | null>(null)

    return (
        <section aria-labelledby="album-title" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <h2
                    id="album-title"
                    className="font-heading flex items-center gap-2 text-2xl font-semibold"
                >
                    <Images className="size-5" />
                    Meu álbum
                    {photos.data && photos.data.length > 0 && (
                        <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-normal tabular-nums">
                            {photos.data.length}
                        </span>
                    )}
                </h2>
                <StorageMeter refreshKey={photos.data?.length} />
            </div>

            {photos.isPending && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="aspect-square rounded-xl" />
                    ))}
                </div>
            )}
            {photos.isError && (
                <div
                    role="alert"
                    className="border-destructive/40 text-destructive flex items-center gap-2 rounded-xl border p-4 text-sm"
                >
                    <CircleAlert className="size-4 shrink-0" />
                    Não foi possível abrir o álbum. Recarregue a página e tente de novo.
                </div>
            )}
            {photos.data?.length === 0 && (
                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center text-sm">
                    <ImagePlus className="size-6" />
                    <p className="max-w-sm text-pretty">
                        Suas fotos aparecem aqui. Elas ficam só neste navegador, nunca vão para um
                        servidor.
                    </p>
                </div>
            )}
            {/* A lista já vem ordenada pela atividade mais recente. Some durante a busca. */}
            {photos.data?.[0] && !query.trim() && <ContinueCard photo={photos.data[0]} />}
            {photos.data && photos.data.length > 1 && (
                <Enter className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-48 flex-1 sm:max-w-xs">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                        <Input
                            type="search"
                            maxLength={200}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Buscar foto pelo nome"
                            aria-label="Buscar foto pelo nome"
                            className="pl-8"
                        />
                    </div>
                    <Select value={sort} onValueChange={(v) => setSort(v as SortKey)} items={SORTS}>
                        <SelectTrigger className="w-44" aria-label="Ordenar fotos">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SORTS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Enter>
            )}
            {photos.data && photos.data.length > 0 && visible.length === 0 && (
                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-12 text-center text-sm">
                    <SearchX className="size-6" />
                    <p>Nenhuma foto com esse nome.</p>
                </div>
            )}
            {visible.length > 0 && (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {shown.map((photo, i) => (
                        <AlbumItem
                            key={photo.id}
                            photo={photo}
                            // Atraso por posição dentro da página: as páginas seguintes não esperam o fim da fila.
                            index={i % PAGE_SIZE}
                            onDelete={setDeleting}
                        />
                    ))}
                </ul>
            )}
            {hasMore && <div ref={sentinelRef} aria-hidden className="h-px shrink-0" />}

            <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir foto?</DialogTitle>
                        <DialogDescription>
                            "{deleting?.name}" e seus ajustes serão apagados deste navegador. Faça
                            um backup no perfil se quiser guardar.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleting(null)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (!deleting) return
                                del.mutate(deleting.id, {
                                    onSuccess: () => toast.success('Foto excluída'),
                                    onError: () => toast.error('Não foi possível excluir'),
                                })
                                setDeleting(null)
                            }}
                        >
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    )
}
