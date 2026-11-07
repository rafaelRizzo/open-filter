// Mapeia EditParams para os uniforms do shader (nomes e normalização num lugar só).
import { type EditParams, PARAM_KEYS, type ParamKey } from './params'

/** Convenção: `exposure` -> `uExposure`, `hslRedHue` -> `uHslRedHue`. */
export const uniformName = (key: ParamKey) => `u${key.charAt(0).toUpperCase()}${key.slice(1)}`

export const UNIFORM_NAMES = Object.fromEntries(
    PARAM_KEYS.map((k) => [k, uniformName(k)]),
) as Record<ParamKey, string>

// Temperatura e matiz vêm em -100..100 na UI; o shader trabalha em -1..1.
const SCALE: Partial<Record<ParamKey, number>> = { temperature: 0.01, tint: 0.01 }

export const toUniforms = (params: EditParams): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const key of PARAM_KEYS) out[UNIFORM_NAMES[key]] = params[key] * (SCALE[key] ?? 1)
    return out
}
