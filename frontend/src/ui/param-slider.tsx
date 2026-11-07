// Linha de slider: só este componente re-renderiza ao arrastar; params vão por callback.
// Reset individual: botão (só quando alterado) ou duplo clique no rótulo.
import { RotateCcw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { Slider } from '@/components/ui/slider'
import { PARAM_LABELS } from '@/editor/groups'
import { PARAM_DEFS, type ParamKey } from '@/editor/params'
import { Hint } from '@/ui/hint'

type Props = {
    paramKey: ParamKey
    initial: number
    onChange: (key: ParamKey, value: number) => void
    /** Fim de um gesto (soltar o slider, resetar): vira um ponto do desfazer/refazer. */
    onCommit?: () => void
    /** Rótulo no lugar do padrão (ex: "Matiz" dentro da faixa Vermelho do HSL). */
    label?: string
}

export const formatValue = (key: ParamKey, value: number) => {
    const text = PARAM_DEFS[key].step < 1 ? value.toFixed(2) : String(Math.round(value))
    // Sinal + só em parâmetros bipolares; "Tamanho do grão" 1.0 não precisa de +.
    return value > 0 && PARAM_DEFS[key].min < 0 ? `+${text}` : text
}

export function ParamSlider({
    paramKey,
    initial,
    onChange,
    onCommit,
    label: labelOverride,
}: Props) {
    const { min, max, step, default: defaultValue } = PARAM_DEFS[paramKey]
    const [value, setValue] = useState(initial)
    const label = labelOverride ?? PARAM_LABELS[paramKey]
    const changed = value !== defaultValue

    const update = (next: number) => {
        setValue(next)
        onChange(paramKey, next)
    }
    const reset = () => {
        update(defaultValue)
        onCommit?.()
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 text-xs">
                <Hint label="Duplo clique para redefinir">
                    {/* biome-ignore lint/a11y/noStaticElementInteractions: atalho extra de mouse: o botão Redefinir ao lado faz o mesmo para teclado */}
                    <span className="cursor-default select-none" onDoubleClick={reset}>
                        {label}
                    </span>
                </Hint>
                <span className="ml-auto flex items-center gap-1.5">
                    <AnimatePresence initial={false}>
                        {changed && (
                            <motion.button
                                type="button"
                                aria-label={`Redefinir ${label}`}
                                onClick={reset}
                                initial={{ opacity: 0, scale: 0.6 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.6 }}
                                transition={{ duration: 0.12 }}
                                className="rounded-sm p-0.5 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                            >
                                <RotateCcw className="size-3.5" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                    <span
                        className={changed ? 'tabular-nums' : 'text-muted-foreground tabular-nums'}
                    >
                        {formatValue(paramKey, value)}
                    </span>
                </span>
            </div>
            <Slider
                aria-label={label}
                min={min}
                max={max}
                step={step}
                largeStep={step * 10}
                onValueCommitted={() => onCommit?.()}
                value={[value]}
                onValueChange={(next) =>
                    update(Array.isArray(next) ? (next[0] ?? min) : (next as number))
                }
            />
        </div>
    )
}
