// Caixa de corte sobre o quadro inteiro: arrastar o miolo move, arrastar as alças redimensiona.
import { type KeyboardEvent, type PointerEvent, useRef } from 'react'
import { type Crop, type CropHandle, moveCrop, resizeCrop } from '@/editor/geometry'
import type { ViewRect } from '@/editor/photo-canvas'

type Props = {
    /** O quadro inteiro (foto girada, sem cortar) na tela, em px do container. */
    frame: ViewRect
    /** Tamanho do quadro em px da original: dá a proporção real ao travar. */
    frameSize: { w: number; h: number }
    crop: Crop
    /** Largura/altura em px do corte travado; null = livre. */
    ratio: number | null
    onChange: (crop: Crop) => void
    onCommit: () => void
}

const CORNERS: CropHandle[] = ['nw', 'ne', 'sw', 'se']
const EDGES: CropHandle[] = ['n', 's', 'e', 'w']

const POSITION: Record<CropHandle, string> = {
    nw: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize',
    ne: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize',
    sw: 'left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize',
    se: 'right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize',
    n: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize',
    s: 'left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-ns-resize',
    e: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
    w: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize',
}

const LABEL: Record<CropHandle, string> = {
    nw: 'canto superior esquerdo',
    ne: 'canto superior direito',
    sw: 'canto inferior esquerdo',
    se: 'canto inferior direito',
    n: 'borda de cima',
    s: 'borda de baixo',
    e: 'borda da direita',
    w: 'borda da esquerda',
}

export function CropOverlay({ frame, frameSize, crop, ratio, onChange, onCommit }: Props) {
    const drag = useRef<{ mode: 'move' | CropHandle; x: number; y: number; start: Crop } | null>(
        null,
    )

    const left = frame.x + crop.x * frame.w
    const top = frame.y + crop.y * frame.h
    const width = crop.w * frame.w
    const height = crop.h * frame.h

    const begin = (mode: 'move' | CropHandle) => (e: PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { mode, x: e.clientX, y: e.clientY, start: crop }
    }
    const update = (e: PointerEvent) => {
        const d = drag.current
        if (!d) return
        // Soltou fora da janela ou perdeu o pointerup: encerra o arrasto.
        if (e.buttons === 0) return end()
        const dx = (e.clientX - d.x) / frame.w
        const dy = (e.clientY - d.y) / frame.h
        onChange(
            d.mode === 'move'
                ? moveCrop(d.start, dx, dy)
                : resizeCrop(d.start, d.mode, dx, dy, ratio, frameSize.w, frameSize.h),
        )
    }
    const end = () => {
        if (!drag.current) return
        drag.current = null
        onCommit()
    }

    const onKey = (e: KeyboardEvent) => {
        const step = e.shiftKey ? 0.05 : 0.005
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0
        if (!dx && !dy) return
        e.preventDefault()
        onChange(moveCrop(crop, dx, dy))
        onCommit()
    }

    // Com proporção travada só os cantos aparecem: as bordas deformariam a proporção.
    const handles = ratio === null ? [...CORNERS, ...EDGES] : CORNERS

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
            {/* Escurece fora da caixa: uma sombra gigante em volta dela. */}
            <div
                className="absolute"
                style={{ left, top, width, height, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
            />
            <div
                role="application"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: precisa receber foco para mover o corte com as setas
                tabIndex={0}
                aria-label="Área de corte. Setas movem, Shift move mais."
                onKeyDown={onKey}
                onPointerDown={begin('move')}
                onPointerMove={update}
                onPointerUp={end}
                onPointerCancel={end}
                onLostPointerCapture={end}
                className="pointer-events-auto absolute cursor-move touch-none border border-white/90 outline-none focus-visible:ring-2 focus-visible:ring-white"
                style={{ left, top, width, height }}
            >
                {/* Terços dentro da caixa, como referência enquanto corta. */}
                <span className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/35" />
                <span className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/35" />
                <span className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/35" />
                <span className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/35" />
                {handles.map((h) => (
                    <span
                        key={h}
                        role="slider"
                        aria-label={`Alça: ${LABEL[h]}`}
                        aria-valuenow={0}
                        tabIndex={-1}
                        onPointerDown={begin(h)}
                        onPointerMove={update}
                        onPointerUp={end}
                        onPointerCancel={end}
                        onLostPointerCapture={end}
                        className={`absolute touch-none rounded-[2px] border border-black/60 bg-white ${
                            h.length === 2
                                ? 'size-3.5'
                                : h === 'n' || h === 's'
                                  ? 'h-2 w-6'
                                  : 'h-6 w-2'
                        } ${POSITION[h]}`}
                    />
                ))}
            </div>
        </div>
    )
}
