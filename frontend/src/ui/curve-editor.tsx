// Editor de curvas: gráfico com pontos arrastáveis (RGB e canais). Clique cria ponto, duplo clique remove.
import { RotateCcw } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    CURVE_CHANNELS,
    type CurveChannel,
    type CurveSet,
    curveIsIdentity,
    evalCurve,
    identityCurve,
    MAX_CURVE_POINTS,
    type Point,
} from '@/editor/curves'
import { cn } from '@/lib/utils'

type Props = {
    curves: CurveSet
    onChange: (channel: CurveChannel, points: Point[]) => void
    onCommit: () => void
}

const SIZE = 256
const MIN_GAP = 0.005
const CHANNEL_META: Record<CurveChannel, { label: string; color: string }> = {
    rgb: { label: 'RGB', color: 'currentColor' },
    r: { label: 'Vermelho', color: '#f87171' },
    g: { label: 'Verde', color: '#4ade80' },
    b: { label: 'Azul', color: '#60a5fa' },
}

const toX = (v: number) => v * SIZE
const toY = (v: number) => (1 - v) * SIZE
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function CurveEditor({ curves: initial, onChange, onCommit }: Props) {
    const [channel, setChannel] = useState<CurveChannel>('rgb')
    // Cópia local para o gráfico acompanhar o arrasto; o pai recebe cada mudança por onChange.
    const [curves, setCurves] = useState<CurveSet>(initial)
    const svgRef = useRef<SVGSVGElement>(null)
    const dragging = useRef<number | null>(null)

    const points = curves[channel]
    const meta = CHANNEL_META[channel]

    const update = (next: Point[]) => {
        setCurves((c) => ({ ...c, [channel]: next }))
        onChange(channel, next)
    }

    const fromEvent = (e: PointerEvent): Point => {
        const rect = (svgRef.current as SVGSVGElement).getBoundingClientRect()
        return [
            clamp01((e.clientX - rect.left) / rect.width),
            clamp01(1 - (e.clientY - rect.top) / rect.height),
        ]
    }

    /** Move o ponto i respeitando os vizinhos (pontos nunca se cruzam). Extremos só mudam em y. */
    const movePoint = (i: number, x: number, y: number) => {
        const pts = points.map((p) => [...p] as Point)
        const last = pts.length - 1
        const px =
            i === 0
                ? 0
                : i === last
                  ? 1
                  : Math.min(
                        (pts[i + 1] as Point)[0] - MIN_GAP,
                        Math.max((pts[i - 1] as Point)[0] + MIN_GAP, x),
                    )
        pts[i] = [px, clamp01(y)]
        update(pts)
    }

    const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
        const [x, y] = fromEvent(e)
        // Pega o ponto mais próximo se estiver a até ~10px; senão cria um novo ponto.
        let hit = -1
        let best = (10 / SIZE) ** 2
        points.forEach((p, i) => {
            const d = (p[0] - x) ** 2 + (p[1] - y) ** 2
            if (d < best) {
                best = d
                hit = i
            }
        })
        if (hit === -1) {
            if (points.length >= MAX_CURVE_POINTS) return
            const next = [...points, [x, y] as Point].sort((a, b) => a[0] - b[0])
            if (next.some((p, i) => i > 0 && p[0] - (next[i - 1] as Point)[0] < MIN_GAP)) return
            hit = next.findIndex((p) => p[0] === x && p[1] === y)
            update(next)
        }
        dragging.current = hit
        e.currentTarget.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
        if (dragging.current === null) return
        // Soltou fora da janela ou perdeu o pointerup: encerra em vez de seguir o mouse sem botão.
        if (e.buttons === 0) return endDrag()
        const [x, y] = fromEvent(e)
        movePoint(dragging.current, x, y)
    }

    const endDrag = () => {
        if (dragging.current === null) return
        dragging.current = null
        onCommit()
    }

    const removePoint = (i: number) => {
        if (i === 0 || i === points.length - 1) return
        update(points.filter((_, idx) => idx !== i))
        onCommit()
    }

    const onPointKey = (e: KeyboardEvent, i: number) => {
        const step = e.shiftKey ? 0.05 : 0.01
        const p = points[i] as Point
        if (e.key === 'ArrowUp') movePoint(i, p[0], p[1] + step)
        else if (e.key === 'ArrowDown') movePoint(i, p[0], p[1] - step)
        else if (e.key === 'ArrowRight') movePoint(i, p[0] + step, p[1])
        else if (e.key === 'ArrowLeft') movePoint(i, p[0] - step, p[1])
        else if ((e.key === 'Delete' || e.key === 'Backspace') && i > 0 && i < points.length - 1)
            removePoint(i)
        else return
        e.preventDefault()
        if (e.key.startsWith('Arrow')) onCommit()
    }

    const path = Array.from({ length: 65 }, (_, i) => {
        const x = i / 64
        return `${i === 0 ? 'M' : 'L'}${toX(x).toFixed(1)},${toY(evalCurve(points, x)).toFixed(1)}`
    }).join(' ')

    const resetChannel = () => {
        update(identityCurve())
        onCommit()
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Canal da curva">
                {CURVE_CHANNELS.map((ch) => (
                    // biome-ignore lint/a11y/useSemanticElements: botão com role=radio e aria-checked: o grupo é navegado por Tab e Enter, igual a um rádio nativo estilizado
                    <button
                        key={ch}
                        type="button"
                        role="radio"
                        aria-checked={ch === channel}
                        onClick={() => setChannel(ch)}
                        className={cn(
                            'rounded-md px-2 py-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            ch === channel
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <span
                            className="mr-1 inline-block size-2 rounded-full align-middle"
                            style={{ backgroundColor: CHANNEL_META[ch].color }}
                        />
                        {CHANNEL_META[ch].label}
                        {!curveIsIdentity(curves[ch]) && ' •'}
                    </button>
                ))}
            </div>

            <svg
                ref={svgRef}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label={`Curva ${meta.label}. Clique para criar ponto, arraste para mover, duplo clique para remover.`}
                className="bg-card aspect-square w-full touch-none rounded-lg border"
                style={{ color: 'var(--foreground)' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
            >
                {[1, 2, 3].map((n) => (
                    <g key={n} stroke="currentColor" strokeOpacity={0.12}>
                        <line x1={(SIZE / 4) * n} y1={0} x2={(SIZE / 4) * n} y2={SIZE} />
                        <line x1={0} y1={(SIZE / 4) * n} x2={SIZE} y2={(SIZE / 4) * n} />
                    </g>
                ))}
                <line
                    x1={0}
                    y1={SIZE}
                    x2={SIZE}
                    y2={0}
                    stroke="currentColor"
                    strokeOpacity={0.25}
                    strokeDasharray="4 4"
                />
                <path d={path} fill="none" stroke={meta.color} strokeWidth={2} />
                {points.map((p, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: pontos não têm id; a ordem é a identidade
                    <g key={i}>
                        <circle
                            cx={toX(p[0])}
                            cy={toY(p[1])}
                            r={5}
                            fill="var(--background)"
                            stroke={meta.color}
                            strokeWidth={2}
                            tabIndex={0}
                            role="slider"
                            aria-label={`Ponto ${i + 1} da curva ${meta.label}`}
                            aria-valuenow={Math.round(p[1] * 100)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="outline-none focus-visible:stroke-[3]"
                            onKeyDown={(e) => onPointKey(e, i)}
                            onDoubleClick={(e) => {
                                e.stopPropagation()
                                removePoint(i)
                            }}
                        />
                    </g>
                ))}
            </svg>

            <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">
                    Clique cria ponto. Duplo clique remove.
                </p>
                <Button
                    variant="ghost"
                    size="xs"
                    disabled={curveIsIdentity(points)}
                    onClick={resetChannel}
                >
                    <RotateCcw data-icon="inline-start" />
                    Redefinir canal
                </Button>
            </div>
        </div>
    )
}
