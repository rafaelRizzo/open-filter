// Schema único dos parâmetros de edição: faixas e padrões usados por UI, shader e validação de preset.
import { z } from 'zod'
import {
    blendCurves,
    type CurveSet,
    curvesAreIdentity,
    curvesEqual,
    curvesSchema,
    identityCurves,
} from './curves'
import { defaultGeometry, geometryEqual, geometrySchema } from './geometry'

export type ParamDef = { min: number; max: number; step: number; default: number }

const BASE_DEFS = {
    exposure: { min: -2, max: 2, step: 0.01, default: 0 },
    contrast: { min: -1, max: 1, step: 0.01, default: 0 },
    highlights: { min: -1, max: 1, step: 0.01, default: 0 },
    shadows: { min: -1, max: 1, step: 0.01, default: 0 },
    whites: { min: -1, max: 1, step: 0.01, default: 0 },
    blacks: { min: -1, max: 1, step: 0.01, default: 0 },
    saturation: { min: -1, max: 1, step: 0.01, default: 0 },
    vibrance: { min: -1, max: 1, step: 0.01, default: 0 },
    temperature: { min: -100, max: 100, step: 1, default: 0 },
    tint: { min: -100, max: 100, step: 1, default: 0 },
    grain: { min: 0, max: 1, step: 0.01, default: 0 },
    grainSize: { min: 1, max: 4, step: 0.1, default: 1 },
    sharpness: { min: -1, max: 1, step: 0.01, default: 0 },
    sharpnessRadius: { min: 0.5, max: 3, step: 0.1, default: 1 },
    clarity: { min: -1, max: 1, step: 0.01, default: 0 },
    dehaze: { min: -1, max: 1, step: 0.01, default: 0 },
    vignette: { min: 0, max: 1, step: 0.01, default: 0 },
    // Ponto médio e suavidade: defaults reproduzem a vinheta original (smoothstep 0.3 a 0.9).
    vignetteMidpoint: { min: 0, max: 1, step: 0.01, default: 0.3 },
    vignetteFeather: { min: 0.05, max: 1, step: 0.01, default: 0.6 },
    fade: { min: 0, max: 1, step: 0.01, default: 0 },
    // HSL global: vale para todas as cores ao mesmo tempo; as 8 faixas ajustam cada cor por cima disso.
    hslAllHue: { min: -1, max: 1, step: 0.01, default: 0 },
    hslAllSat: { min: -1, max: 1, step: 0.01, default: 0 },
    hslAllLum: { min: -1, max: 1, step: 0.01, default: 0 },
    // Intensidade do LUT 3D importado (sem LUT carregado não tem efeito).
    lutStrength: { min: 0, max: 1, step: 0.01, default: 1 },
} as const satisfies Record<string, ParamDef>

/** Faixas de cor do HSL, com o centro do matiz em graus. */
export const HSL_BANDS = [
    'red',
    'orange',
    'yellow',
    'green',
    'aqua',
    'blue',
    'purple',
    'magenta',
] as const
export type HslBand = (typeof HSL_BANDS)[number]
export const HSL_CENTERS: Record<HslBand, number> = {
    red: 0,
    orange: 30,
    yellow: 60,
    green: 120,
    aqua: 180,
    blue: 240,
    purple: 270,
    magenta: 300,
}
export const HSL_PROPS = ['Hue', 'Sat', 'Lum'] as const
export type HslProp = (typeof HSL_PROPS)[number]
export type HslKey = `hsl${Capitalize<HslBand>}${HslProp}`

/** Zonas do color grading em 3 vias. */
export const GRADE_ZONES = ['shadows', 'midtones', 'highlights'] as const
export type GradeZone = (typeof GRADE_ZONES)[number]
export const GRADE_PROPS = ['Hue', 'Sat', 'Lum'] as const
export type GradeProp = (typeof GRADE_PROPS)[number]
export type GradeKey = `grade${Capitalize<GradeZone>}${GradeProp}` | 'gradeBalance'

const cap = <S extends string>(s: S) => (s.charAt(0).toUpperCase() + s.slice(1)) as Capitalize<S>

export const hslKey = (band: HslBand, prop: HslProp) => `hsl${cap(band)}${prop}` as HslKey
export const gradeKey = (zone: GradeZone, prop: GradeProp) => `grade${cap(zone)}${prop}` as GradeKey

const HSL_DEF: Record<HslProp, ParamDef> = {
    Hue: { min: -1, max: 1, step: 0.01, default: 0 },
    Sat: { min: -1, max: 1, step: 0.01, default: 0 },
    Lum: { min: -1, max: 1, step: 0.01, default: 0 },
}
const GRADE_DEF: Record<GradeProp, ParamDef> = {
    Hue: { min: 0, max: 360, step: 1, default: 0 },
    Sat: { min: 0, max: 1, step: 0.01, default: 0 },
    Lum: { min: -1, max: 1, step: 0.01, default: 0 },
}

export type BaseKey = keyof typeof BASE_DEFS
export type ParamKey = BaseKey | HslKey | GradeKey

const buildDefs = (): Record<ParamKey, ParamDef> => {
    const defs: Record<string, ParamDef> = { ...BASE_DEFS }
    for (const band of HSL_BANDS)
        for (const prop of HSL_PROPS) defs[hslKey(band, prop)] = HSL_DEF[prop]
    for (const zone of GRADE_ZONES)
        for (const prop of GRADE_PROPS) defs[gradeKey(zone, prop)] = GRADE_DEF[prop]
    defs.gradeBalance = { min: -1, max: 1, step: 0.01, default: 0 }
    return defs as Record<ParamKey, ParamDef>
}

export const PARAM_DEFS = buildDefs()
export const PARAM_KEYS = Object.keys(PARAM_DEFS) as ParamKey[]

// Cada campo é opcional com default: preset parcial (ex: seed "Retrô") continua válido.
const field = (key: ParamKey) =>
    z.number().min(PARAM_DEFS[key].min).max(PARAM_DEFS[key].max).default(PARAM_DEFS[key].default)

const scalarShape = Object.fromEntries(PARAM_KEYS.map((k) => [k, field(k)])) as Record<
    ParamKey,
    ReturnType<typeof field>
>

// geometry (corte, giro, espelho) vive junto da foto mas NÃO é de preset: ver compactParams e blendParams.
export const paramsSchema = z.object({
    ...scalarShape,
    curves: curvesSchema,
    geometry: geometrySchema,
})

export type EditParams = z.infer<typeof paramsSchema>
export type ScalarParams = Omit<EditParams, 'curves' | 'geometry'>

export const defaultParams = (): EditParams => paramsSchema.parse({})

/** Mistura `from` -> `to` (t de 0 a 1). Usado na intensidade do preset (0 = original, 1 = preset cheio). */
export const blendParams = (from: EditParams, to: EditParams, t: number): EditParams => {
    const k = Math.min(1, Math.max(0, t))
    // A geometria (corte, giro) nunca entra na mistura: preset muda cor, não enquadramento.
    const out: EditParams = { ...from, curves: blendCurves(from.curves, to.curves, k) }
    for (const key of PARAM_KEYS) out[key] = from[key] + (to[key] - from[key]) * k
    return out
}

/** true quando nenhum parâmetro difere do padrão (usado para habilitar o "Redefinir tudo"). */
export const isDefaultParams = (params: EditParams): boolean =>
    PARAM_KEYS.every((key) => params[key] === PARAM_DEFS[key].default) &&
    curvesAreIdentity(params.curves)

export const paramsEqual = (a: EditParams, b: EditParams): boolean =>
    PARAM_KEYS.every((k) => a[k] === b[k]) &&
    curvesEqual(a.curves, b.curves) &&
    geometryEqual(a.geometry, b.geometry)

/** Só o que difere do padrão: enxuto para salvar no banco (limite de 2 KB por preset). */
export const compactParams = (params: EditParams): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const key of PARAM_KEYS)
        if (params[key] !== PARAM_DEFS[key].default) out[key] = Number(params[key].toFixed(4))
    if (!curvesAreIdentity(params.curves)) {
        const curves: Record<string, unknown> = {}
        for (const [ch, pts] of Object.entries(params.curves)) {
            if (
                !(
                    pts.length === 2 &&
                    pts[0]?.[0] === 0 &&
                    pts[0]?.[1] === 0 &&
                    pts[1]?.[0] === 1 &&
                    pts[1]?.[1] === 1
                )
            ) {
                curves[ch] = pts.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))])
            }
        }
        out.curves = curves
    }
    return out
}

export type { CurveSet }
export { defaultGeometry, identityCurves }
