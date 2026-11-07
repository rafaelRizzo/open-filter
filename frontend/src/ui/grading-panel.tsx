// Color grading em 3 vias: sombras, meios-tons e realces, cada um com cor (matiz e saturação) e luminância.
import { useState } from 'react'
import { PROP_SHORT, ZONE_LABELS } from '@/editor/groups'
import { type EditParams, GRADE_PROPS, GRADE_ZONES, gradeKey, type ParamKey } from '@/editor/params'
import { ParamSlider } from './param-slider'

type Props = {
    params: EditParams
    onChange: (key: ParamKey, value: number) => void
    onCommit: () => void
}

export function GradingPanel({ params, onChange, onCommit }: Props) {
    const [, setTick] = useState(0)
    const bump = () => setTick((t) => t + 1)

    return (
        <div className="flex flex-col gap-5">
            {GRADE_ZONES.map((zone) => {
                const hue = params[gradeKey(zone, 'Hue')]
                const sat = params[gradeKey(zone, 'Sat')]
                return (
                    <section key={zone} className="flex flex-col gap-4 rounded-lg border p-3">
                        <h3 className="flex items-center gap-2 text-sm font-medium">
                            <span
                                aria-hidden
                                className="size-4 rounded-full border"
                                style={{
                                    backgroundColor: `hsl(${hue} ${Math.round(sat * 100)}% 50%)`,
                                }}
                            />
                            {ZONE_LABELS[zone]}
                        </h3>
                        {GRADE_PROPS.map((prop) => {
                            const key = gradeKey(zone, prop)
                            return (
                                <ParamSlider
                                    key={key}
                                    paramKey={key}
                                    label={PROP_SHORT[prop]}
                                    initial={params[key]}
                                    onChange={(k, v) => {
                                        onChange(k, v)
                                        bump()
                                    }}
                                    onCommit={() => {
                                        onCommit()
                                        bump()
                                    }}
                                />
                            )
                        })}
                    </section>
                )
            })}
            <ParamSlider
                paramKey="gradeBalance"
                initial={params.gradeBalance}
                onChange={onChange}
                onCommit={onCommit}
            />
        </div>
    )
}
