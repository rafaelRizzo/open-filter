// Testes do schema de params: faixas, defaults, preset parcial, compactação, mistura e igualdade.
import { describe, expect, it } from 'vitest'
import { identityCurves } from './curves'
import { defaultGeometry } from './geometry'
import {
    blendParams,
    compactParams,
    defaultParams,
    GRADE_ZONES,
    gradeKey,
    HSL_BANDS,
    hslKey,
    isDefaultParams,
    PARAM_DEFS,
    PARAM_KEYS,
    paramsEqual,
    paramsSchema,
} from './params'

describe('paramsSchema', () => {
    it('tem as chaves de base, HSL por faixa, HSL global, grading e LUT', () => {
        expect(PARAM_KEYS).toContain('exposure')
        expect(PARAM_KEYS).toContain('clarity')
        expect(PARAM_KEYS).toContain('hslAllHue')
        expect(PARAM_KEYS).toContain(hslKey('blue', 'Sat'))
        expect(PARAM_KEYS).toContain(gradeKey('shadows', 'Hue'))
        expect(PARAM_KEYS).toContain('gradeBalance')
        expect(PARAM_KEYS).toContain('lutStrength')
        // 8 faixas x 3 + 3 globais + 3 zonas x 3 + balanço + os de base
        expect(PARAM_KEYS.filter((k) => k.startsWith('hsl'))).toHaveLength(HSL_BANDS.length * 3 + 3)
        expect(PARAM_KEYS.filter((k) => k.startsWith('grade'))).toHaveLength(
            GRADE_ZONES.length * 3 + 1,
        )
    })

    it('defaultParams devolve o default de cada parâmetro, curvas retas e geometria padrão', () => {
        const p = defaultParams()
        for (const key of PARAM_KEYS) expect(p[key]).toBe(PARAM_DEFS[key].default)
        expect(p.curves).toEqual(identityCurves())
        expect(p.geometry).toEqual(defaultGeometry())
    })

    it('preset parcial completa o resto com defaults', () => {
        const parsed = paramsSchema.parse({ exposure: -0.4, grain: 0.6 })
        expect(parsed.exposure).toBe(-0.4)
        expect(parsed.grain).toBe(0.6)
        expect(parsed.contrast).toBe(0)
        expect(parsed.vignetteFeather).toBe(0.6)
    })

    it.each(PARAM_KEYS)('%s aceita os limites e rejeita fora da faixa', (key) => {
        const { min, max } = PARAM_DEFS[key]
        expect(paramsSchema.safeParse({ [key]: min }).success).toBe(true)
        expect(paramsSchema.safeParse({ [key]: max }).success).toBe(true)
        expect(paramsSchema.safeParse({ [key]: min - 0.01 }).success).toBe(false)
        expect(paramsSchema.safeParse({ [key]: max + 0.01 }).success).toBe(false)
    })

    it('rejeita tipo errado e curva com x fora de ordem', () => {
        expect(paramsSchema.safeParse({ exposure: '1' }).success).toBe(false)
        const bad = {
            rgb: [
                [0, 0],
                [0.8, 0.5],
                [0.4, 0.4],
                [1, 1],
            ],
        }
        expect(paramsSchema.safeParse({ curves: bad }).success).toBe(false)
    })

    it('o default de cada parâmetro está dentro da própria faixa', () => {
        for (const key of PARAM_KEYS) {
            const { min, max, default: d } = PARAM_DEFS[key]
            expect(d).toBeGreaterThanOrEqual(min)
            expect(d).toBeLessThanOrEqual(max)
        }
    })

    it('hslKey e gradeKey montam o nome no padrão camelCase', () => {
        expect(hslKey('red', 'Hue')).toBe('hslRedHue')
        expect(hslKey('magenta', 'Lum')).toBe('hslMagentaLum')
        expect(gradeKey('midtones', 'Sat')).toBe('gradeMidtonesSat')
    })
})

describe('isDefaultParams e paramsEqual', () => {
    it('padrão é default; mexer em qualquer ajuste ou curva deixa de ser', () => {
        expect(isDefaultParams(defaultParams())).toBe(true)
        expect(isDefaultParams({ ...defaultParams(), exposure: 0.1 })).toBe(false)
        const curved = {
            ...defaultParams(),
            curves: {
                ...identityCurves(),
                rgb: [
                    [0, 0],
                    [0.5, 0.4],
                    [1, 1],
                ] as [number, number][],
            },
        }
        expect(isDefaultParams(curved)).toBe(false)
    })

    it('geometria não conta como ajuste (corte não habilita "redefinir tudo")', () => {
        const cropped = { ...defaultParams(), geometry: { ...defaultGeometry(), rotate: 1 } }
        expect(isDefaultParams(cropped)).toBe(true)
    })

    it('paramsEqual compara escalares, curvas e geometria', () => {
        const a = defaultParams()
        expect(paramsEqual(a, defaultParams())).toBe(true)
        expect(paramsEqual(a, { ...a, contrast: 0.2 })).toBe(false)
        expect(paramsEqual(a, { ...a, geometry: { ...a.geometry, flipX: true } })).toBe(false)
        const curved = {
            ...a,
            curves: {
                ...a.curves,
                r: [
                    [0, 0.1],
                    [1, 1],
                ] as [number, number][],
            },
        }
        expect(paramsEqual(a, curved)).toBe(false)
    })
})

describe('compactParams', () => {
    it('devolve só o que difere do padrão e nunca a geometria', () => {
        const p = {
            ...defaultParams(),
            exposure: -0.4,
            grain: 0.6,
            geometry: { ...defaultGeometry(), rotate: 2 },
        }
        expect(compactParams(p)).toEqual({ exposure: -0.4, grain: 0.6 })
    })

    it('inclui só os canais de curva alterados', () => {
        const p = {
            ...defaultParams(),
            curves: {
                ...identityCurves(),
                g: [
                    [0, 0],
                    [0.5, 0.6],
                    [1, 1],
                ] as [number, number][],
            },
        }
        expect(compactParams(p)).toEqual({
            curves: {
                g: [
                    [0, 0],
                    [0.5, 0.6],
                    [1, 1],
                ],
            },
        })
    })

    it('é pequeno e volta ao mesmo preset quando validado de novo', () => {
        const p = { ...defaultParams(), exposure: 0.3333333, saturation: -0.25, hslBlueHue: 0.15 }
        const compact = compactParams(p)
        expect(JSON.stringify(compact).length).toBeLessThan(2000)
        const back = paramsSchema.parse(compact)
        expect(back.exposure).toBeCloseTo(0.3333, 4)
        expect(back.saturation).toBe(-0.25)
        expect(back.hslBlueHue).toBe(0.15)
    })
})

describe('blendParams', () => {
    const target = {
        ...defaultParams(),
        exposure: -1,
        contrast: 0.5,
        curves: {
            ...identityCurves(),
            rgb: [
                [0, 0],
                [0.5, 0.3],
                [1, 1],
            ] as [number, number][],
        },
    }

    it('t=0 fica no origem e t=1 chega no destino', () => {
        const from = defaultParams()
        expect(blendParams(from, target, 0).exposure).toBe(0)
        expect(blendParams(from, target, 1).exposure).toBe(-1)
        expect(blendParams(from, target, 1).contrast).toBe(0.5)
    })

    it('interpola no meio e prende t fora de 0 a 1', () => {
        const from = defaultParams()
        expect(blendParams(from, target, 0.5).exposure).toBeCloseTo(-0.5)
        expect(blendParams(from, target, 7).exposure).toBe(-1)
        expect(blendParams(from, target, -3).exposure).toBe(0)
    })

    it('a geometria vem sempre da origem: preset não mexe no enquadramento', () => {
        const from = { ...defaultParams(), geometry: { ...defaultGeometry(), rotate: 3 } }
        expect(
            blendParams(from, { ...target, geometry: defaultGeometry() }, 1).geometry.rotate,
        ).toBe(3)
    })

    it('mistura as curvas junto', () => {
        const half = blendParams(defaultParams(), target, 0.5)
        const mid = half.curves.rgb.find((p) => p[0] === 0.5)
        expect(mid?.[1]).toBeCloseTo(0.4, 2)
    })
})
