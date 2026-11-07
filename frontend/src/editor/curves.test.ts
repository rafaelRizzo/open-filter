// Testes das curvas: schema, identidade, spline monótono, LUT 256 e mistura.
import { describe, expect, it } from 'vitest'
import {
    blendCurve,
    blendCurves,
    buildCurveLut,
    type CurveSet,
    curveIsIdentity,
    curvesAreIdentity,
    curvesEqual,
    curvesSchema,
    evalCurve,
    identityCurve,
    identityCurves,
    MAX_CURVE_POINTS,
    type Point,
} from './curves'

const lift: Point[] = [
    [0, 0],
    [0.5, 0.7],
    [1, 1],
]

describe('identidade e schema', () => {
    it('curva reta e identidade', () => {
        expect(curveIsIdentity(identityCurve())).toBe(true)
        expect(curveIsIdentity(lift)).toBe(false)
        expect(
            curveIsIdentity([
                [0, 0.1],
                [1, 1],
            ]),
        ).toBe(false)
        expect(curvesAreIdentity(identityCurves())).toBe(true)
        expect(curvesAreIdentity({ ...identityCurves(), b: lift })).toBe(false)
    })

    it('curvesEqual compara tamanho e pontos', () => {
        const a = identityCurves()
        expect(curvesEqual(a, identityCurves())).toBe(true)
        expect(curvesEqual(a, { ...a, g: lift })).toBe(false)
        expect(
            curvesEqual(
                { ...a, g: lift },
                {
                    ...a,
                    g: [
                        [0, 0],
                        [0.5, 0.71],
                        [1, 1],
                    ],
                },
            ),
        ).toBe(false)
    })

    it('schema completa o que falta e valida limites', () => {
        expect(curvesSchema.parse(undefined)).toEqual(identityCurves())
        expect(curvesSchema.parse({ r: lift }).r).toEqual(lift)
        expect(curvesSchema.safeParse({ rgb: [[0, 0]] }).success).toBe(false)
        expect(
            curvesSchema.safeParse({
                rgb: [
                    [0, 0],
                    [0, 1],
                ],
            }).success,
        ).toBe(false)
        expect(
            curvesSchema.safeParse({
                rgb: [
                    [0, 0],
                    [1, 2],
                ],
            }).success,
        ).toBe(false)
        const many = Array.from({ length: MAX_CURVE_POINTS + 1 }, (_, i) => [i / 20, i / 20])
        expect(curvesSchema.safeParse({ rgb: many }).success).toBe(false)
    })
})

describe('evalCurve', () => {
    it('reta é a identidade', () => {
        for (const x of [0, 0.25, 0.5, 1]) expect(evalCurve(identityCurve(), x)).toBeCloseTo(x, 10)
    })

    it('passa exatamente pelos pontos e prende fora do domínio', () => {
        expect(evalCurve(lift, 0.5)).toBeCloseTo(0.7, 10)
        expect(evalCurve(lift, -1)).toBe(0)
        expect(evalCurve(lift, 2)).toBe(1)
    })

    it('é monótona e nunca estoura 0..1, mesmo com ponto agressivo', () => {
        const harsh: Point[] = [
            [0, 0],
            [0.4, 0.9],
            [0.5, 0.92],
            [1, 1],
        ]
        let prev = -1
        for (let i = 0; i <= 200; i++) {
            const y = evalCurve(harsh, i / 200)
            expect(y).toBeGreaterThanOrEqual(prev - 1e-9)
            expect(y).toBeGreaterThanOrEqual(0)
            expect(y).toBeLessThanOrEqual(1)
            prev = y
        }
    })

    it('trecho plano continua plano', () => {
        const flat: Point[] = [
            [0, 0.2],
            [0.5, 0.2],
            [1, 0.9],
        ]
        expect(evalCurve(flat, 0.25)).toBeCloseTo(0.2, 10)
    })
})

describe('buildCurveLut', () => {
    it('curvas retas geram a rampa 0..255 opaca', () => {
        const lut = buildCurveLut(identityCurves())
        expect(lut).toHaveLength(1024)
        for (const i of [0, 1, 100, 255]) {
            expect(lut[i * 4]).toBe(i)
            expect(lut[i * 4 + 1]).toBe(i)
            expect(lut[i * 4 + 2]).toBe(i)
            expect(lut[i * 4 + 3]).toBe(255)
        }
    })

    it('a curva do canal mexe só nele e a mestra compõe com todos', () => {
        const onlyR = buildCurveLut({ ...identityCurves(), r: lift })
        expect(onlyR[128 * 4]).toBeGreaterThan(128)
        expect(onlyR[128 * 4 + 1]).toBe(128)
        const master = buildCurveLut({ ...identityCurves(), rgb: lift })
        expect(master[128 * 4]).toBe(master[128 * 4 + 1])
        expect(master[128 * 4 + 2]).toBeGreaterThan(128)
    })

    it('reaproveita o buffer passado', () => {
        const out = new Uint8Array(1024)
        expect(buildCurveLut(identityCurves(), out)).toBe(out)
    })
})

describe('blend', () => {
    it('t nas pontas devolve cópias das curvas', () => {
        const a = blendCurve(identityCurve(), lift, 0)
        expect(a).toEqual(identityCurve())
        expect(a).not.toBe(identityCurve())
        expect(blendCurve(identityCurve(), lift, 1)).toEqual(lift)
        expect(blendCurve(identityCurve(), lift, -2)).toEqual(identityCurve())
    })

    it('no meio mistura amostrando a união dos x', () => {
        const mid = blendCurve(identityCurve(), lift, 0.5)
        expect(mid.map((p) => p[0])).toEqual([0, 0.5, 1])
        expect(mid[1]?.[1]).toBeCloseTo(0.6, 10)
    })

    it('blendCurves trata os quatro canais', () => {
        const to: CurveSet = { rgb: lift, r: lift, g: lift, b: lift }
        const half = blendCurves(identityCurves(), to, 0.5)
        for (const ch of ['rgb', 'r', 'g', 'b'] as const)
            expect(half[ch][1]?.[1]).toBeCloseTo(0.6, 10)
    })
})
