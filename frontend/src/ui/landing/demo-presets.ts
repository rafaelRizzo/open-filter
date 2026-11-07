// Presets da demo da landing: os mesmos números do seed.sql, mais um "Cinema" que usa curvas e grading.
import type { Point } from '@/editor/curves'
import { type EditParams, paramsSchema } from '@/editor/params'

type Demo = { id: string; name: string; params: EditParams }

const make = (id: string, name: string, partial: Record<string, unknown>): Demo => ({
    id,
    name,
    params: paramsSchema.parse(partial),
})

// Curva em S suave: sombras mais fundas, realces mais abertos.
const sCurve: Point[] = [
    [0, 0],
    [0.25, 0.18],
    [0.75, 0.84],
    [1, 1],
]

export const DEMO_PRESETS: readonly Demo[] = [
    make('retro', 'Retrô', {
        exposure: -0.4,
        contrast: 0.1,
        saturation: -0.25,
        temperature: 15,
        grain: 0.6,
        sharpness: -0.3,
        vignette: 0.3,
    }),
    make('bw', 'Preto e branco', { contrast: 0.25, saturation: -1, grain: 0.35, vignette: 0.2 }),
    make('fade', 'Filme fade', {
        contrast: -0.1,
        saturation: -0.15,
        fade: 0.45,
        grain: 0.4,
        vignette: 0.15,
    }),
    make('cold', 'Frio', { temperature: -35, tint: -5, contrast: 0.05, fade: 0.1 }),
    make('cinema', 'Cinema', {
        contrast: 0.08,
        vibrance: 0.2,
        vignette: 0.25,
        gradeShadowsHue: 205,
        gradeShadowsSat: 0.45,
        gradeHighlightsHue: 38,
        gradeHighlightsSat: 0.3,
        hslYellowSat: 0.25,
        hslBlueHue: 0.15,
        curves: { rgb: sCurve },
    }),
]
