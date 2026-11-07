// Hero da landing: o editor de verdade. Foto de exemplo com antes/depois ao vivo (o mesmo shader do app).
import { animate } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { curveIsIdentity } from '@/editor/curves'
import { PARAM_LABELS } from '@/editor/groups'
import { defaultParams, type EditParams, PARAM_DEFS, PARAM_KEYS } from '@/editor/params'
import { type CanvasHandle, PhotoCanvas, type ViewRect } from '@/editor/photo-canvas'
import { cn } from '@/lib/utils'
import { decodePhoto } from '@/photos/decode'
import { SplitDivider } from '../split-divider'
import { DEMO_PRESETS } from './demo-presets'

const SAMPLE_URL = '/sample.webp'

const formatValue = (key: (typeof PARAM_KEYS)[number], value: number) => {
    const text = PARAM_DEFS[key].step < 1 ? value.toFixed(2) : String(Math.round(value))
    return value > 0 && PARAM_DEFS[key].min < 0 ? `+${text}` : text
}

/** Só o que difere do padrão, na ordem do schema: é a leitura real do que o shader está aplicando. */
const readout = (params: EditParams) => {
    const items: { label: string; value: string }[] = []
    for (const key of PARAM_KEYS) {
        if (params[key] !== PARAM_DEFS[key].default)
            items.push({
                label: PARAM_LABELS[key].toLowerCase(),
                value: formatValue(key, params[key]),
            })
    }
    if (!curveIsIdentity(params.curves.rgb))
        items.push({ label: 'curva rgb', value: `${params.curves.rgb.length} pontos` })
    return items
}

export function LiveDemo() {
    const canvasRef = useRef<CanvasHandle>(null)
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
    const [failed, setFailed] = useState(false)
    const [presetId, setPresetId] = useState(DEMO_PRESETS[0]?.id ?? '')
    // Começa em 1: só a original aparece (linha colada na borda direita), sem flash em 50%.
    const [split, setSplit] = useState(1)
    const [rect, setRect] = useState<ViewRect | null>(null)
    const swept = useRef(false)

    const preset = DEMO_PRESETS.find((p) => p.id === presetId) ?? DEMO_PRESETS[0]
    const params = preset?.params ?? defaultParams()
    // Leitura de cada preset calculada uma vez: todas são renderizadas para reservar a altura da maior.
    const readouts = useMemo(
        () => DEMO_PRESETS.map((p) => ({ id: p.id, items: readout(p.params) })),
        [],
    )

    useEffect(() => {
        let cancelled = false
        let decoded: ImageBitmap | null = null
        fetch(SAMPLE_URL)
            .then((r) => r.blob())
            .then(decodePhoto)
            .then(({ preview }) => {
                if (cancelled) return preview.close()
                decoded = preview
                setBitmap(preview)
            })
            .catch(() => !cancelled && setFailed(true))
        return () => {
            cancelled = true
            decoded?.close()
        }
    }, [])

    // Troca de preset: o canvas recebe os params novos direto, sem recriar nada.
    useEffect(() => {
        canvasRef.current?.setParams(params)
    }, [params])

    const changeSplit = (fraction: number) => {
        setSplit(fraction)
        canvasRef.current?.setSplit(fraction)
    }

    // Único movimento da página, em três tempos: a original, a editada e o lado a lado.
    // A linha parte da borda direita (só "antes"), varre até a esquerda (só "depois") e assenta em 50%.
    // Os controles ficam em refs e só param ao desmontar: o rect muda a cada layout do canvas e
    // não pode cancelar a animação no meio.
    const sweep = useRef<{ stop: () => void } | null>(null)
    const hold = useRef<ReturnType<typeof setTimeout> | null>(null)
    // biome-ignore lint/correctness/useExhaustiveDependencies: roda uma vez por foto pronta (swept); changeSplit só usa setters e refs
    useEffect(() => {
        if (!bitmap || !rect || swept.current) return
        swept.current = true
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            changeSplit(0.5)
            return
        }
        changeSplit(1)
        sweep.current = animate(1, 0, {
            duration: 1.5,
            ease: [0.65, 0, 0.35, 1],
            delay: 0.9,
            onUpdate: changeSplit,
            onComplete: () => {
                // Uma pausa curta na foto toda editada antes de voltar para o lado a lado.
                hold.current = setTimeout(() => {
                    sweep.current = animate(0, 0.5, {
                        duration: 1.1,
                        ease: [0.22, 1, 0.36, 1],
                        onUpdate: changeSplit,
                    })
                }, 700)
            },
        })
        // changeSplit só usa setState e a ref do canvas: estável o bastante para rodar uma vez
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bitmap, rect])
    useEffect(
        () => () => {
            sweep.current?.stop()
            if (hold.current) clearTimeout(hold.current)
        },
        [],
    )

    return (
        <figure className="flex flex-col gap-3">
            <div
                className="bg-card relative mx-auto w-full overflow-hidden rounded-sm border"
                style={{
                    aspectRatio: '3 / 2',
                    maxHeight: '70vh',
                    width: 'min(100%, calc(70vh * 1.5))',
                }}
            >
                {bitmap ? (
                    <>
                        <PhotoCanvas
                            ref={canvasRef}
                            bitmap={bitmap}
                            initialParams={params}
                            interactive={false}
                            className="absolute inset-0"
                            onViewChange={(v) => setRect(v.rect)}
                        />
                        {rect && <SplitDivider rect={rect} split={split} onSplit={changeSplit} />}
                    </>
                ) : (
                    <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
                        {failed
                            ? 'Não foi possível carregar a foto de exemplo.'
                            : 'Carregando a foto de exemplo...'}
                    </div>
                )}
            </div>

            <div
                className="mx-auto flex w-full flex-col gap-3"
                style={{ width: 'min(100%, calc(70vh * 1.5))' }}
            >
                <div
                    className="flex flex-wrap gap-2"
                    role="radiogroup"
                    aria-label="Preset da demonstração"
                >
                    {DEMO_PRESETS.map((p) => (
                        // biome-ignore lint/a11y/useSemanticElements: botão com role=radio e aria-checked, navegado por Tab e Enter
                        <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={p.id === presetId}
                            onClick={() => setPresetId(p.id)}
                            className={cn(
                                'focus-visible:ring-ring/50 rounded-full border px-3 py-1 text-sm outline-none transition-colors focus-visible:ring-3',
                                p.id === presetId
                                    ? 'bg-foreground text-background border-foreground'
                                    : 'hover:bg-accent',
                            )}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>
                {/* A altura é a da maior leitura (todas empilhadas na mesma célula da grade, só a ativa visível):
                    nada é cortado e trocar de preset não move o título nem o resto da página. */}
                <div className="grid" aria-live="polite">
                    {readouts.map(({ id, items }) => (
                        <dl
                            key={id}
                            aria-hidden={id !== presetId}
                            className={cn(
                                'text-muted-foreground col-start-1 row-start-1 flex flex-wrap content-start gap-x-5 gap-y-1 font-mono text-xs',
                                id !== presetId && 'invisible',
                            )}
                        >
                            {items.map((item) => (
                                <div key={item.label} className="flex gap-1.5">
                                    <dt>{item.label}</dt>
                                    <dd className="text-foreground">{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                    ))}
                </div>
            </div>
            <figcaption
                className="text-muted-foreground mx-auto w-full text-xs"
                style={{ width: 'min(100%, calc(70vh * 1.5))' }}
            >
                <p>
                    Arraste a linha para comparar o antes e o depois. O filtro é o mesmo do editor e
                    roda agora na sua placa de vídeo.
                </p>
                <p className="mt-1 opacity-70">Foto: Nabih E Navarro, no Unsplash.</p>
            </figcaption>
        </figure>
    )
}
