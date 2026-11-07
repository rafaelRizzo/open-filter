// Progresso da exportação em etapas com frases. O trabalho de uma etapa não informa avanço interno,
// então a barra anda sozinha em direção ao teto da etapa e salta quando a etapa (ou um bloco) termina.
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { ExportFormat, ExportPhase } from '@/editor/export'
import { cn } from '@/lib/utils'

export type ExportStatus = {
    phase: ExportPhase | 'done'
    /** Blocos já renderizados e total (a renderização é dividida em blocos nas fotos grandes). */
    done: number
    total: number
    /** Tamanho do arquivo pronto, para a frase final. */
    sizeMb?: string
}

const STEPS: { phase: ExportPhase | 'done'; label: string }[] = [
    { phase: 'decode', label: 'Ler' },
    { phase: 'render', label: 'Aplicar' },
    { phase: 'encode', label: 'Gerar' },
    { phase: 'done', label: 'Baixar' },
]

// Faixa de cada etapa na barra (render ocupa mais: é a que mais demora).
const DECODE_END = 12
const RENDER_END = 70
const ENCODE_END = 96

const range = (s: ExportStatus): [floor: number, ceiling: number] => {
    switch (s.phase) {
        case 'decode':
            return [0, DECODE_END - 2]
        case 'render': {
            const span = RENDER_END - DECODE_END
            const size = span / Math.max(s.total, 1)
            const floor = DECODE_END + s.done * size
            return [floor, floor + size - 2]
        }
        case 'encode':
            return [RENDER_END, ENCODE_END]
        case 'done':
            return [100, 100]
    }
}

const sentence = (s: ExportStatus, format: ExportFormat) => {
    switch (s.phase) {
        case 'decode':
            return 'Lendo a foto original...'
        case 'render':
            return s.total > 1
                ? `Aplicando os ajustes, bloco ${Math.min(s.done + 1, s.total)} de ${s.total}...`
                : 'Aplicando os ajustes na foto inteira...'
        case 'encode':
            return format === 'image/jpeg' ? 'Comprimindo o JPEG...' : 'Gerando o PNG...'
        case 'done':
            return `Pronto${s.sizeMb ? ` (${s.sizeMb} MB)` : ''}! Iniciando o download...`
    }
}

export function ExportProgress({ status, format }: { status: ExportStatus; format: ExportFormat }) {
    const [percent, setPercent] = useState(2)
    const [floor, ceiling] = range(status)

    useEffect(() => {
        // Nunca anda para trás; ao mudar de etapa, salta para o piso dela.
        setPercent((p) => Math.max(p, floor))
        if (status.phase === 'done') return
        const id = setInterval(() => setPercent((p) => p + (ceiling - p) * 0.06), 120)
        return () => clearInterval(id)
    }, [floor, ceiling, status.phase])

    const current = STEPS.findIndex((s) => s.phase === status.phase)

    return (
        <div className="flex flex-col gap-3">
            <ol className="flex items-center justify-between gap-2 text-xs">
                {STEPS.map((step, i) => {
                    const complete = i < current || status.phase === 'done'
                    const active = i === current && status.phase !== 'done'
                    return (
                        <li
                            key={step.phase}
                            className={cn(
                                'flex items-center gap-1.5',
                                complete || active ? 'text-foreground' : 'text-muted-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-4 items-center justify-center rounded-full border',
                                    complete && 'bg-primary text-primary-foreground border-primary',
                                    // Etapa ativa: só o spinner, sem anel em volta.
                                    active && 'border-transparent',
                                )}
                            >
                                {complete ? (
                                    <Check className="size-3" />
                                ) : active ? (
                                    // Div com borda, não SVG: o navegador anima transform de elemento HTML fora da
                                    // thread principal, então o giro continua mesmo durante a renderização pesada.
                                    <span className="border-primary size-3.5 animate-spin rounded-full border-2 border-t-transparent" />
                                ) : null}
                            </span>
                            {step.label}
                        </li>
                    )
                })}
            </ol>
            <div
                role="progressbar"
                aria-label="Progresso da exportação"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                className="bg-muted relative h-2 overflow-hidden rounded-full"
            >
                <div
                    className="bg-primary h-full origin-left rounded-full transition-transform duration-300 ease-out"
                    style={{ transform: `scaleX(${Math.max(percent, 1) / 100})` }}
                />
                {/* Brilho que corre sozinho (CSS puro): mostra vida mesmo quando a thread está ocupada. */}
                {status.phase !== 'done' && (
                    <div className="export-shimmer absolute inset-y-0 left-0 w-1/4 rounded-full" />
                )}
            </div>
            <p className="text-muted-foreground text-xs tabular-nums" role="status">
                {sentence(status, format)}
            </p>
        </div>
    )
}
