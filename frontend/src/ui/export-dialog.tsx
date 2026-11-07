// Diálogo de exportação: formato (JPEG/PNG), qualidade do JPEG, progresso por tile e download.
import { Download, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
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
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type ExportFormat, exportPhoto, extensionFor } from '@/editor/export'
import { outputSize } from '@/editor/geometry'
import type { Lut } from '@/editor/lut'
import type { EditParams } from '@/editor/params'
import { ExportProgress, type ExportStatus } from './export-progress'

type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    original: Blob
    name: string
    /** Lê os params atuais no momento de exportar (vivem em ref, não em estado). */
    getParams: () => EditParams
    lut?: Lut | null
    /** Medidas da foto original (com EXIF) para mostrar o tamanho final. */
    photoSize?: { w: number; h: number }
}

const FORMAT_HINT: Record<ExportFormat, string> = {
    'image/jpeg':
        'Arquivo menor, com uma perda leve de detalhe. Serve para compartilhar e publicar.',
    'image/png':
        'Sem perda de qualidade, mas o arquivo fica bem maior. Serve para guardar ou editar depois.',
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, '') || 'foto'

const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    // Revoga depois do clique: o navegador já iniciou o download.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function ExportDialog({
    open,
    onOpenChange,
    original,
    name,
    getParams,
    lut,
    photoSize,
}: Props) {
    const [format, setFormat] = useState<ExportFormat>('image/jpeg')
    const [quality, setQuality] = useState(0.92)
    const [status, setStatus] = useState<ExportStatus | null>(null)
    const [error, setError] = useState<string | null>(null)
    const hintId = useId()
    const busy = status !== null
    // Lê a geometria no momento de abrir: o corte e o tamanho final vêm da aba Cortar.
    const finalSize =
        open && photoSize ? outputSize(photoSize.w, photoSize.h, getParams().geometry) : null

    const onExport = async () => {
        setError(null)
        setStatus({ phase: 'decode', done: 0, total: 1 })
        try {
            const blob = await exportPhoto(original, getParams(), {
                format,
                quality,
                lut,
                onPhase: (phase) => setStatus((s) => ({ done: 0, total: 1, ...s, phase })),
                onProgress: (done, total) =>
                    setStatus((s) => ({ phase: 'render', ...s, done, total })),
            })
            const sizeMb = (blob.size / 1048576).toFixed(1)
            // Mostra o "Pronto!" por um instante antes de fechar e baixar.
            setStatus({ phase: 'done', done: 1, total: 1, sizeMb })
            await new Promise((resolve) => setTimeout(resolve, 900))
            download(blob, `${baseName(name)}-editada.${extensionFor(format)}`)
            toast.success(`Foto exportada (${sizeMb} MB)`)
            onOpenChange(false)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Não foi possível exportar a foto'
            setError(message)
            toast.error(message)
        } finally {
            setStatus(null)
        }
    }

    const megapixels = finalSize
        ? ((finalSize.w * finalSize.h) / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
        : null

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (busy) return
                if (next) setError(null)
                onOpenChange(next)
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Exportar foto</DialogTitle>
                    <DialogDescription>
                        Resolução total, processada no seu navegador.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody>
                    <div className="flex flex-col gap-4">
                        {finalSize && (
                            <div className="bg-muted/50 flex flex-col gap-0.5 rounded-lg px-3 py-2.5">
                                <span className="text-muted-foreground text-xs">Tamanho final</span>
                                <span className="text-lg font-medium tabular-nums" role="status">
                                    {finalSize.w} × {finalSize.h} px
                                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                                        {megapixels} MP
                                    </span>
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    Corte e tamanho se ajustam na aba Cortar.
                                </span>
                            </div>
                        )}

                        <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium">Formato</span>
                            <Tabs
                                value={format}
                                onValueChange={(v) => setFormat(v as ExportFormat)}
                            >
                                <TabsList className="w-full" aria-describedby={hintId}>
                                    <TabsTrigger value="image/jpeg" disabled={busy}>
                                        JPEG
                                    </TabsTrigger>
                                    <TabsTrigger value="image/png" disabled={busy}>
                                        PNG
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                            {/* Duas linhas reservadas: trocar de formato não muda a altura. */}
                            <p id={hintId} className="text-muted-foreground min-h-8 text-xs">
                                {FORMAT_HINT[format]}
                            </p>
                        </div>

                        {/* Altura fixa: a linha de qualidade só some de vista no PNG. */}
                        <div className="flex h-12 flex-col justify-center gap-2">
                            {format === 'image/jpeg' ? (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">Qualidade</span>
                                        <span className="text-muted-foreground tabular-nums">
                                            {Math.round(quality * 100)}%
                                        </span>
                                    </div>
                                    <Slider
                                        aria-label="Qualidade"
                                        min={0.5}
                                        max={1}
                                        step={0.01}
                                        value={[quality]}
                                        disabled={busy}
                                        onValueChange={(v) =>
                                            setQuality(
                                                Array.isArray(v) ? (v[0] ?? 0.92) : (v as number),
                                            )
                                        }
                                    />
                                </>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    O PNG não usa o controle de qualidade.
                                </p>
                            )}
                        </div>

                        {/* Altura reservada: progresso e erro não empurram o rodapé. */}
                        <div className="flex min-h-20 flex-col justify-center gap-1.5">
                            {status && <ExportProgress status={status} format={format} />}
                            {!busy && error && (
                                <p
                                    className="text-destructive flex items-start gap-1.5 text-xs"
                                    role="alert"
                                >
                                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                                    <span className="line-clamp-2">{error}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancelar
                    </Button>
                    <Button onClick={onExport} disabled={busy}>
                        <Download data-icon="inline-start" />
                        {busy ? 'Exportando...' : error ? 'Tentar de novo' : 'Exportar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
