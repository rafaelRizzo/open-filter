// Aba "Cortar": proporção, girar, espelhar, endireitar e tamanho final. Tudo vive na foto, não nos presets.
import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
    ASPECTS,
    type AspectId,
    cropIsFull,
    cropPixels,
    defaultGeometry,
    fitCropToRatio,
    flipGeometry,
    frameSize,
    type Geometry,
    isIdentityGeometry,
    outputSize,
    rotateGeometry,
    STRAIGHTEN_LIMIT,
} from '@/editor/geometry'
import { cn } from '@/lib/utils'
import { Hint } from '@/ui/hint'

type Props = {
    geometry: Geometry
    /** Medidas da foto original já com o EXIF aplicado. */
    photoSize: { w: number; h: number }
    aspect: AspectId
    onAspect: (aspect: AspectId, ratio: number | null) => void
    onChange: (geometry: Geometry) => void
    onCommit: () => void
}

const SCALES = [1, 0.75, 0.5, 0.25]

/** Proporção em px (largura/altura) de uma opção; "original" usa a do quadro. */
export const aspectRatio = (id: AspectId, frame: { w: number; h: number }): number | null => {
    const opt = ASPECTS.find((a) => a.id === id)
    if (!opt || opt.ratio === null) return null
    return opt.ratio === 'original' ? frame.w / frame.h : opt.ratio
}

export function CropPanel({ geometry: g, photoSize, aspect, onAspect, onChange, onCommit }: Props) {
    const frame = frameSize(photoSize.w, photoSize.h, g)
    const cropPx = cropPixels(photoSize.w, photoSize.h, g)
    const out = outputSize(photoSize.w, photoSize.h, g)
    const [widthText, setWidthText] = useState(String(out.w))

    const apply = (next: Geometry) => {
        onChange(next)
        onCommit()
    }

    const pickAspect = (id: AspectId) => {
        const ratio = aspectRatio(id, frame)
        onAspect(id, ratio)
        if (ratio !== null) apply({ ...g, crop: fitCropToRatio(g.crop, ratio, frame.w, frame.h) })
    }

    const setWidth = (value: number | null) => {
        const next = value === null ? null : Math.min(16384, Math.max(16, Math.round(value)))
        apply({ ...g, exportWidth: next === cropPx.w ? null : next })
        setWidthText(String(next ?? cropPx.w))
    }

    return (
        <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Proporção</h3>
                <div
                    className="flex flex-wrap gap-1.5"
                    role="radiogroup"
                    aria-label="Proporção do corte"
                >
                    {ASPECTS.map((a) => (
                        // biome-ignore lint/a11y/useSemanticElements: botão com role=radio e aria-checked: o grupo é navegado por Tab e Enter, igual a um rádio nativo estilizado
                        <button
                            key={a.id}
                            type="button"
                            role="radio"
                            aria-checked={a.id === aspect}
                            onClick={() => pickAspect(a.id)}
                            className={cn(
                                'focus-visible:ring-ring/50 rounded-md border px-2 py-1 text-xs outline-none focus-visible:ring-3',
                                a.id === aspect
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'hover:bg-accent',
                            )}
                        >
                            {a.label}
                        </button>
                    ))}
                </div>
                <p className="text-muted-foreground text-xs">
                    Arraste a caixa para mover e as alças para redimensionar. Com uma proporção
                    escolhida, só os cantos aparecem.
                </p>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Girar e espelhar</h3>
                <div className="grid grid-cols-4 gap-1.5">
                    <Hint label="Girar para a esquerda">
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Girar 90° para a esquerda"
                            onClick={() => apply(rotateGeometry(g, 'ccw'))}
                        >
                            <RotateCcw />
                        </Button>
                    </Hint>
                    <Hint label="Girar para a direita">
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Girar 90° para a direita"
                            onClick={() => apply(rotateGeometry(g, 'cw'))}
                        >
                            <RotateCw />
                        </Button>
                    </Hint>
                    <Hint label="Espelhar na horizontal">
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Espelhar na horizontal"
                            onClick={() => apply(flipGeometry(g, 'h'))}
                        >
                            <FlipHorizontal2 />
                        </Button>
                    </Hint>
                    <Hint label="Espelhar na vertical">
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Espelhar na vertical"
                            onClick={() => apply(flipGeometry(g, 'v'))}
                        >
                            <FlipVertical2 />
                        </Button>
                    </Hint>
                </div>
            </section>

            <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                    <Hint label="Duplo clique para zerar">
                        {/* biome-ignore lint/a11y/noStaticElementInteractions: atalho extra de mouse: o botão Redefinir ao lado faz o mesmo para teclado */}
                        <span
                            className="cursor-default select-none font-medium"
                            onDoubleClick={() => apply({ ...g, straighten: 0 })}
                        >
                            Endireitar
                        </span>
                    </Hint>
                    <span
                        className={cn(
                            'tabular-nums',
                            g.straighten === 0 && 'text-muted-foreground',
                        )}
                    >
                        {g.straighten > 0 ? '+' : ''}
                        {g.straighten.toFixed(1)}°
                    </span>
                </div>
                <Slider
                    aria-label="Endireitar"
                    min={-STRAIGHTEN_LIMIT}
                    max={STRAIGHTEN_LIMIT}
                    step={0.1}
                    largeStep={1}
                    value={[g.straighten]}
                    onValueChange={(v) =>
                        onChange({
                            ...g,
                            straighten: Array.isArray(v) ? (v[0] ?? 0) : (v as number),
                        })
                    }
                    onValueCommitted={onCommit}
                />
                <p className="text-muted-foreground text-xs">
                    A foto é ampliada o mínimo para não sobrar canto vazio.
                </p>
            </section>

            <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Tamanho final</h3>
                <fieldset
                    className="flex min-w-0 flex-wrap gap-1.5"
                    aria-label="Escala do tamanho final"
                >
                    {SCALES.map((s) => {
                        const w = Math.round(cropPx.w * s)
                        const active = out.w === w
                        return (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setWidth(s === 1 ? null : w)}
                                className={cn(
                                    'focus-visible:ring-ring/50 rounded-md border px-2 py-1 text-xs outline-none focus-visible:ring-3',
                                    active
                                        ? 'bg-foreground text-background border-foreground'
                                        : 'hover:bg-accent',
                                )}
                            >
                                {s === 1 ? 'Original' : `${s * 100}%`}
                            </button>
                        )
                    })}
                </fieldset>
                <div className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                        <Label htmlFor="export-width" className="text-xs">
                            Largura (px)
                        </Label>
                        <Input
                            id="export-width"
                            type="number"
                            inputMode="numeric"
                            min={16}
                            max={16384}
                            value={widthText}
                            onChange={(e) => setWidthText(e.target.value)}
                            onBlur={() =>
                                Number(widthText) > 0
                                    ? setWidth(Number(widthText))
                                    : setWidthText(String(out.w))
                            }
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                    </div>
                    <p className="text-muted-foreground pb-2 text-xs tabular-nums">
                        {out.w} × {out.h} px
                    </p>
                </div>
                <p className="text-muted-foreground text-xs">
                    A altura acompanha a largura. O corte atual tem {cropPx.w} × {cropPx.h} px.
                </p>
            </section>

            <Button
                variant="outline"
                size="sm"
                disabled={isIdentityGeometry(g) && cropIsFull(g.crop)}
                onClick={() => {
                    onAspect('free', null)
                    apply(defaultGeometry())
                    setWidthText(String(photoSize.w))
                }}
            >
                <RotateCcw data-icon="inline-start" />
                Redefinir corte e giro
            </Button>
        </div>
    )
}
