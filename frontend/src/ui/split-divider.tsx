// Divisor antes/depois arrastável sobre a imagem. Posição em fração da largura da imagem (0 a 1).
import { ChevronsLeftRight } from 'lucide-react'
import { type KeyboardEvent, type PointerEvent, useRef } from 'react'
import type { ViewRect } from '@/editor/photo-canvas'

type Props = { rect: ViewRect; split: number; onSplit: (fraction: number) => void }

// Rótulo em vidro fosco: legível sobre foto clara ou escura.
const CHIP =
    'absolute top-2 rounded-md bg-black/45 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm transition-opacity duration-150'

// 0 e 1 valem: dá para levar o divisor até as pontas da foto, sem sobrar vão.
const clamp = (v: number) => Math.min(1, Math.max(0, v))

export function SplitDivider({ rect, split, onSplit }: Props) {
    const dragging = useRef(false)
    const rootRef = useRef<HTMLDivElement>(null)

    const fromPointer = (e: PointerEvent) => {
        const left = rootRef.current?.parentElement?.getBoundingClientRect().left ?? 0
        onSplit(clamp((e.clientX - left - rect.x) / rect.w))
    }

    const onKeyDown = (e: KeyboardEvent) => {
        const step = e.shiftKey ? 0.1 : 0.02
        if (e.key === 'ArrowLeft') onSplit(clamp(split - step))
        else if (e.key === 'ArrowRight') onSplit(clamp(split + step))
        else return
        e.preventDefault()
    }

    // A linha só cobre a altura da imagem visível dentro do container.
    const x = rect.x + split * rect.w
    return (
        <div
            ref={rootRef}
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
        >
            <span
                className={`${CHIP} ${x - rect.x < 72 ? 'opacity-0' : ''}`}
                style={{ left: Math.max(8, rect.x + 8) }}
            >
                Antes
            </span>
            <span
                className={`${CHIP} -translate-x-full ${rect.x + rect.w - x < 72 ? 'opacity-0' : ''}`}
                style={{ left: Math.max(8, rect.x + rect.w - 8) }}
            >
                Depois
            </span>
            <div
                className="group/split pointer-events-auto absolute top-0 h-full w-8 -translate-x-1/2 cursor-ew-resize touch-none outline-none focus-visible:[&>div]:ring-3"
                style={{ left: x }}
                role="slider"
                tabIndex={0}
                aria-label="Divisor antes e depois"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(split * 100)}
                onKeyDown={onKeyDown}
                onPointerDown={(e) => {
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
                <div className="mx-auto h-full w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.5)] ring-ring/50" />
                <div className="absolute top-1/2 left-1/2 flex h-11 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-800 shadow-[0_2px_10px_rgba(0,0,0,0.45)] ring-1 ring-black/10 transition-transform duration-150 group-hover/split:scale-110 group-active/split:scale-95">
                    <ChevronsLeftRight className="size-4" strokeWidth={2.5} />
                </div>
            </div>
        </div>
    )
}
