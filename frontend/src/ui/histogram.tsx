// Histograma RGB + luminância desenhado em canvas 2D, com aviso de estouro (realces e sombras).
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { HistogramController } from '@/editor/histogram'

type Props = { controller: HistogramController | null }

const noop = () => () => undefined

const percent = (v: number) => `${(v * 100).toFixed(v > 0 && v < 0.001 ? 2 : 1)}%`

export function Histogram({ controller }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const data = useSyncExternalStore(
        controller ? controller.subscribe : noop,
        controller ? controller.get : () => null,
    )

    const hasClip = !!data && (data.clipHigh > 0.005 || data.clipLow > 0.005)

    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext('2d')
        if (!canvas || !ctx) return
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (!data) return

        // Escala pelo percentil alto para um pico (ex: fundo preto) não achatar o resto.
        const all = [...data.r, ...data.g, ...data.b, ...data.luma].sort((a, b) => a - b)
        const peak = Math.max(1, all[Math.floor(all.length * 0.995)] ?? 1)
        const channels: [Uint32Array, string][] = [
            [data.r, 'rgba(255,60,60,0.55)'],
            [data.g, 'rgba(60,220,90,0.55)'],
            [data.b, 'rgba(70,120,255,0.55)'],
        ]
        ctx.globalCompositeOperation = 'lighter'
        for (const [bins, color] of channels) {
            ctx.fillStyle = color
            for (let i = 0; i < 256; i++) {
                const h = Math.min(1, (bins[i] as number) / peak) * canvas.height
                ctx.fillRect(i, canvas.height - h, 1, h)
            }
        }
        ctx.globalCompositeOperation = 'source-over'
    }, [data])

    return (
        <div className="flex flex-col gap-1">
            <canvas
                ref={canvasRef}
                width={256}
                height={80}
                aria-label="Histograma"
                role="img"
                className="h-20 w-full rounded-md border bg-card"
            />
            {/* Altura fixa sempre: a linha de estouro aparece e some sem empurrar o painel de ajustes. */}
            <p className="text-muted-foreground h-4 text-xs leading-4" role="status">
                {data && hasClip ? (
                    <>
                        Estouro:{' '}
                        {data.clipHigh > 0.005 && (
                            <span className="text-red-400">realces {percent(data.clipHigh)}</span>
                        )}
                        {data.clipHigh > 0.005 && data.clipLow > 0.005 && ' e '}
                        {data.clipLow > 0.005 && (
                            <span className="text-blue-400">sombras {percent(data.clipLow)}</span>
                        )}
                    </>
                ) : (
                    <span className="invisible">Sem estouro</span>
                )}
            </p>
        </div>
    )
}
