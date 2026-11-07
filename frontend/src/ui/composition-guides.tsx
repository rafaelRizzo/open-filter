// Grades de composição e linha do horizonte sobre a foto. Só no preview: nada disso vai para a exportação.
import { type KeyboardEvent, type PointerEvent, useRef } from 'react'
import { baseSpiralOrientation, type GridKind, goldenFigure, gridSegments } from '@/editor/guides'
import type { ViewRect } from '@/editor/photo-canvas'

type Props = {
    rect: ViewRect
    grid: GridKind
    horizon: boolean
    /** Posição do horizonte: 0 (topo) a 1 (base) da foto. */
    horizonY: number
    onHorizonY: (y: number) => void
    /** Orientação da espiral: bit 0 = espelhada, bit 1 = girada 180° (0 a 3). */
    spiralTurn: number
}

const clamp = (v: number) => Math.min(1, Math.max(0, v))

// Cada linha é desenhada duas vezes (escura e clara) para aparecer tanto em foto clara quanto escura.
function Line({
    x1,
    y1,
    x2,
    y2,
    dashed,
}: {
    x1: number
    y1: number
    x2: number
    y2: number
    dashed?: boolean
}) {
    const dash = dashed ? '6 5' : undefined
    return (
        <>
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(0,0,0,0.45)"
                strokeWidth={3}
                strokeDasharray={dash}
            />
            <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={1}
                strokeDasharray={dash}
            />
        </>
    )
}

// Espiral áurea e os quadrados da sequência, esticados para cobrir exatamente a foto.
function GoldenFigure({ rect, turn }: { rect: ViewRect; turn: number }) {
    // O retângulo áureo só combina com a foto quando o lado maior bate (paisagem com paisagem, retrato com
    // retrato). Girar 90° jogaria uma figura deitada dentro de uma foto em pé: ela viraria uma elipse espremida.
    // Por isso só existem 4 orientações válidas: a inicial do formato, +180° e o espelho de cada uma.
    // `turn`: bit 0 = espelhado, bit 1 = girado 180°.
    const orientation =
        ((baseSpiralOrientation(rect.w, rect.h) + (turn & 2 ? 2 : 0)) % 4) + (turn & 1 ? 4 : 0)
    const { spiral, squares } = goldenFigure(orientation)
    const d = spiral
        .map(
            ([a, b], i) =>
                `${i === 0 ? 'M' : 'L'}${(a * rect.w).toFixed(1)},${(b * rect.h).toFixed(1)}`,
        )
        .join(' ')
    return (
        <>
            {squares.map(([x1, y1, x2, y2], i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: a ordem dos quadrados é a identidade
                <g key={i} opacity={0.7}>
                    <Line x1={x1 * rect.w} y1={y1 * rect.h} x2={x2 * rect.w} y2={y2 * rect.h} />
                </g>
            ))}
            <path
                d={d}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={3.5}
                strokeLinejoin="round"
            />
            <path
                d={d}
                fill="none"
                stroke="rgba(255,214,102,0.98)"
                strokeWidth={1.75}
                strokeLinejoin="round"
            />
        </>
    )
}

export function CompositionGuides({
    rect,
    grid,
    horizon,
    horizonY,
    onHorizonY,
    spiralTurn,
}: Props) {
    const dragging = useRef(false)
    const root = useRef<HTMLDivElement>(null)

    const fromPointer = (e: PointerEvent) => {
        const top = root.current?.getBoundingClientRect().top ?? 0
        onHorizonY(clamp((e.clientY - top) / rect.h))
    }
    const onKey = (e: KeyboardEvent) => {
        const step = e.shiftKey ? 0.05 : 0.005
        if (e.key === 'ArrowUp') onHorizonY(clamp(horizonY - step))
        else if (e.key === 'ArrowDown') onHorizonY(clamp(horizonY + step))
        else return
        e.preventDefault()
    }

    const segments = gridSegments(grid, rect.w, rect.h)
    const y = horizonY * rect.h

    return (
        <div
            ref={root}
            className="pointer-events-none absolute select-none"
            style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
        >
            <svg
                width={rect.w}
                height={rect.h}
                viewBox={`0 0 ${rect.w} ${rect.h}`}
                className="absolute inset-0 overflow-visible"
                aria-hidden
            >
                {segments.map((s, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: segmentos são recalculados a cada render, sem identidade própria
                    <Line key={i} {...s} />
                ))}
                {grid === 'golden' && <GoldenFigure rect={rect} turn={spiralTurn} />}
                {horizon && <Line x1={0} y1={y} x2={rect.w} y2={y} dashed />}
            </svg>
            {horizon && (
                <div
                    role="slider"
                    tabIndex={0}
                    aria-label="Linha do horizonte"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(horizonY * 100)}
                    className="pointer-events-auto absolute left-0 h-6 w-full -translate-y-1/2 cursor-ns-resize touch-none outline-none focus-visible:[&>span]:ring-2"
                    style={{ top: y }}
                    onKeyDown={onKey}
                    onPointerDown={(e) => {
                        // Sem isso o arrasto começa a selecionar o texto "Horizonte" junto.
                        e.preventDefault()
                        dragging.current = true
                        e.currentTarget.setPointerCapture(e.pointerId)
                        fromPointer(e)
                    }}
                    onPointerMove={(e) => {
                        if (!dragging.current) return
                        // Soltou fora da janela: sem botão pressionado o arrasto acaba.
                        if (e.buttons === 0) dragging.current = false
                        else fromPointer(e)
                    }}
                    onPointerUp={() => {
                        dragging.current = false
                    }}
                    onPointerCancel={() => {
                        dragging.current = false
                    }}
                    onLostPointerCapture={() => {
                        dragging.current = false
                    }}
                >
                    <span className="bg-background/80 text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded px-1.5 py-0.5 text-xs ring-white/80">
                        Horizonte
                    </span>
                </div>
            )}
        </div>
    )
}
