// Agrupamento e rótulos (pt-BR) dos controles do editor.
import {
    GRADE_ZONES,
    type GradeZone,
    gradeKey,
    HSL_BANDS,
    HSL_PROPS,
    type HslBand,
    hslKey,
    type ParamKey,
} from './params'

export const BAND_LABELS: Record<HslBand, string> = {
    red: 'Vermelho',
    orange: 'Laranja',
    yellow: 'Amarelo',
    green: 'Verde',
    aqua: 'Ciano',
    blue: 'Azul',
    purple: 'Roxo',
    magenta: 'Magenta',
}

export const ZONE_LABELS: Record<GradeZone, string> = {
    shadows: 'Sombras',
    midtones: 'Meios-tons',
    highlights: 'Realces',
}

const PROP_LABELS = { Hue: 'Matiz', Sat: 'Saturação', Lum: 'Luminância' } as const

const base: Record<string, string> = {
    exposure: 'Exposição',
    contrast: 'Contraste',
    highlights: 'Realces',
    shadows: 'Sombras',
    whites: 'Brancos',
    blacks: 'Pretos',
    saturation: 'Saturação',
    vibrance: 'Vibração',
    temperature: 'Temperatura',
    tint: 'Matiz',
    grain: 'Granulação',
    grainSize: 'Tamanho do grão',
    sharpness: 'Nitidez',
    sharpnessRadius: 'Raio da nitidez',
    clarity: 'Claridade',
    dehaze: 'Remover névoa',
    vignette: 'Vinheta',
    vignetteMidpoint: 'Ponto médio da vinheta',
    vignetteFeather: 'Suavidade da vinheta',
    fade: 'Desbotado',
    glitch: 'Glitch',
    glitchSize: 'Altura das bandas',
    glitchSeed: 'Semente do glitch',
    hslAllHue: 'Todas as cores: matiz',
    hslAllSat: 'Todas as cores: saturação',
    hslAllLum: 'Todas as cores: luminância',
    lutStrength: 'Intensidade do LUT',
    gradeBalance: 'Balanço',
}

const buildLabels = (): Record<ParamKey, string> => {
    const labels = { ...base }
    for (const band of HSL_BANDS)
        for (const prop of HSL_PROPS)
            labels[hslKey(band, prop)] = `${BAND_LABELS[band]}: ${PROP_LABELS[prop].toLowerCase()}`
    for (const zone of GRADE_ZONES)
        for (const prop of HSL_PROPS)
            labels[gradeKey(zone, prop)] =
                `${ZONE_LABELS[zone]}: ${PROP_LABELS[prop].toLowerCase()}`
    return labels as Record<ParamKey, string>
}

export const PARAM_LABELS = buildLabels()
export const PROP_SHORT = PROP_LABELS

export type ParamGroup = { id: string; label: string; keys: readonly ParamKey[] }

/** Abas só de sliders. HSL, grading, curvas e LUT têm tela própria. */
export const PARAM_GROUPS: readonly ParamGroup[] = [
    {
        id: 'light',
        label: 'Luz',
        keys: ['exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks'],
    },
    { id: 'color', label: 'Cor', keys: ['saturation', 'vibrance', 'temperature', 'tint'] },
    {
        id: 'effects',
        label: 'Efeitos',
        keys: ['grain', 'grainSize', 'vignette', 'vignetteMidpoint', 'vignetteFeather', 'fade'],
    },
    {
        id: 'glitch',
        label: 'Glitch',
        keys: ['glitch', 'glitchSize', 'glitchSeed'],
    },
    { id: 'detail', label: 'Detalhe', keys: ['sharpness', 'sharpnessRadius', 'clarity', 'dehaze'] },
]

/** Todas as abas na ordem de exibição (e dos atalhos 1 a 7). */
export const TABS = [
    { id: 'light', label: 'Luz' },
    { id: 'color', label: 'Cor' },
    { id: 'hsl', label: 'HSL' },
    { id: 'grading', label: 'Grading' },
    { id: 'curves', label: 'Curvas' },
    { id: 'effects', label: 'Efeitos' },
    { id: 'detail', label: 'Detalhe' },
    { id: 'crop', label: 'Cortar' },
] as const
export type TabId = (typeof TABS)[number]['id']

/** Parâmetros que cada aba controla: "Redefinir esta aba" volta só esses ao padrão. */
export const tabParamKeys = (id: TabId): readonly ParamKey[] => {
    if (id === 'hsl') {
        return [
            'hslAllHue',
            'hslAllSat',
            'hslAllLum',
            ...HSL_BANDS.flatMap((b) => HSL_PROPS.map((p) => hslKey(b, p))),
        ]
    }
    if (id === 'grading')
        return ['gradeBalance', ...GRADE_ZONES.flatMap((z) => HSL_PROPS.map((p) => gradeKey(z, p)))]
    // Curvas e corte não são parâmetros numéricos: têm reset próprio.
    if (id === 'curves' || id === 'crop') return []
    // Glitch fica na aba Efeitos. O LUT carregado não é parâmetro: a aba Efeitos só volta a intensidade dele ao padrão.
    const keys = PARAM_GROUPS.find((g) => g.id === id)?.keys ?? []
    if (id !== 'effects') return keys
    const glitch = PARAM_GROUPS.find((g) => g.id === 'glitch')?.keys ?? []
    return [...keys, ...glitch, 'lutStrength']
}

export const tabHasCurves = (id: TabId) => id === 'curves'
