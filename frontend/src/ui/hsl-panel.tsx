// HSL: por padrão ajusta TODAS as cores de uma vez; as 8 faixas (vermelho a magenta) ajustam cada cor por cima.
import { useState } from 'react'
import { BAND_LABELS, PROP_SHORT } from '@/editor/groups'
import {
    type EditParams,
    HSL_BANDS,
    HSL_CENTERS,
    HSL_PROPS,
    type HslBand,
    hslKey,
    PARAM_DEFS,
    type ParamKey,
} from '@/editor/params'
import { cn } from '@/lib/utils'
import { Hint } from '@/ui/hint'
import { ParamSlider } from './param-slider'

type Props = {
    params: EditParams
    onChange: (key: ParamKey, value: number) => void
    onCommit: () => void
}

type Target = 'all' | HslBand

const swatch = (band: HslBand) => `hsl(${HSL_CENTERS[band]} 85% 55%)`
// "Todas": o círculo cromático inteiro, para ficar claro que mexe em todas as cores.
const ALL_SWATCH =
    'conic-gradient(from 0deg, hsl(0 85% 55%), hsl(60 85% 55%), hsl(120 85% 55%), hsl(180 85% 55%), hsl(240 85% 55%), hsl(300 85% 55%), hsl(0 85% 55%))'

const keyFor = (target: Target, prop: (typeof HSL_PROPS)[number]): ParamKey =>
    target === 'all' ? (`hslAll${prop}` as ParamKey) : hslKey(target, prop)

export function HslPanel({ params, onChange, onCommit }: Props) {
    const [target, setTarget] = useState<Target>('all')
    // `params` é um objeto mutável (ref do editor): o contador força reler os indicadores de alterado.
    const [, setTick] = useState(0)
    const touched = (t: Target) =>
        HSL_PROPS.some((p) => params[keyFor(t, p)] !== PARAM_DEFS[keyFor(t, p)].default)

    const options: { id: Target; label: string; background: string }[] = [
        { id: 'all', label: 'Todas as cores', background: ALL_SWATCH },
        ...HSL_BANDS.map((b) => ({
            id: b as Target,
            label: BAND_LABELS[b],
            background: swatch(b),
        })),
    ]

    return (
        <div className="flex flex-col gap-4">
            <div
                className="grid grid-cols-9 justify-items-center"
                role="radiogroup"
                aria-label="Cor a ajustar"
            >
                {options.map((o) => (
                    <Hint key={o.id} label={o.label}>
                        {/* biome-ignore lint/a11y/useSemanticElements: botão com role=radio e aria-checked: o grupo é navegado por Tab e Enter, igual a um rádio nativo estilizado */}
                        <button
                            type="button"
                            role="radio"
                            aria-checked={o.id === target}
                            aria-label={o.label}
                            onClick={() => setTarget(o.id)}
                            style={{ background: o.background }}
                            className={cn(
                                'ring-offset-card focus-visible:ring-ring/50 relative size-7 rounded-full ring-offset-2 outline-none transition-shadow focus-visible:ring-3',
                                o.id === target
                                    ? 'ring-foreground ring-2'
                                    : 'hover:ring-foreground/40 hover:ring-2',
                            )}
                        >
                            {touched(o.id) && (
                                <span className="border-card bg-foreground absolute -top-0.5 -right-0.5 size-2 rounded-full border" />
                            )}
                        </button>
                    </Hint>
                ))}
            </div>
            <p className="text-muted-foreground text-xs">
                {target === 'all' ? (
                    <>
                        Ajustando <span className="text-foreground">todas as cores</span> de uma
                        vez. Escolha uma cor acima para mexer só nela.
                    </>
                ) : (
                    <>
                        Ajustando <span className="text-foreground">{BAND_LABELS[target]}</span>. Só
                        os pixels dessa cor mudam (além do ajuste de todas as cores).
                    </>
                )}
            </p>
            <div key={target} className="flex flex-col gap-5">
                {HSL_PROPS.map((prop) => {
                    const key = keyFor(target, prop)
                    return (
                        <ParamSlider
                            key={key}
                            paramKey={key}
                            label={PROP_SHORT[prop]}
                            initial={params[key]}
                            onChange={(k, v) => {
                                onChange(k, v)
                                setTick((t) => t + 1)
                            }}
                            onCommit={() => {
                                onCommit()
                                setTick((t) => t + 1)
                            }}
                        />
                    )
                })}
            </div>
        </div>
    )
}
