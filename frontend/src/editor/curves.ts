// Curvas de tom: pontos (x, y) de 0 a 1, spline cúbica monótona (sem ondulação) e LUT de 256 entradas.
import { z } from 'zod'

export type Point = [number, number]
export const CURVE_CHANNELS = ['rgb', 'r', 'g', 'b'] as const
export type CurveChannel = (typeof CURVE_CHANNELS)[number]
export type CurveSet = Record<CurveChannel, Point[]>

export const MAX_CURVE_POINTS = 12
export const identityCurve = (): Point[] => [
    [0, 0],
    [1, 1],
]
export const identityCurves = (): CurveSet => ({
    rgb: identityCurve(),
    r: identityCurve(),
    g: identityCurve(),
    b: identityCurve(),
})

const pointSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])
const curveSchema = z
    .array(pointSchema)
    .min(2)
    .max(MAX_CURVE_POINTS)
    // x estritamente crescente: o spline monótono exige pontos ordenados e sem repetição.
    .refine((pts) => pts.every((p, i) => i === 0 || p[0] > (pts[i - 1] as Point)[0]))

export const curvesSchema = z
    .object({
        rgb: curveSchema.default(identityCurve),
        r: curveSchema.default(identityCurve),
        g: curveSchema.default(identityCurve),
        b: curveSchema.default(identityCurve),
    })
    .default(identityCurves)

export const curveIsIdentity = (pts: readonly Point[]) =>
    pts.length === 2 &&
    pts[0]?.[0] === 0 &&
    pts[0]?.[1] === 0 &&
    pts[1]?.[0] === 1 &&
    pts[1]?.[1] === 1

export const curvesAreIdentity = (c: CurveSet) =>
    CURVE_CHANNELS.every((ch) => curveIsIdentity(c[ch]))

export const curvesEqual = (a: CurveSet, b: CurveSet) =>
    CURVE_CHANNELS.every(
        (ch) =>
            a[ch].length === b[ch].length &&
            a[ch].every(
                (p, i) => p[0] === (b[ch][i] as Point)[0] && p[1] === (b[ch][i] as Point)[1],
            ),
    )

/** Spline cúbica monótona (Fritsch-Carlson): passa pelos pontos e nunca ultrapassa seus valores. */
export const evalCurve = (pts: readonly Point[], x: number): number => {
    const n = pts.length
    const first = pts[0] as Point
    const last = pts[n - 1] as Point
    if (x <= first[0]) return first[1]
    if (x >= last[0]) return last[1]

    const dx: number[] = []
    const slope: number[] = []
    for (let i = 0; i < n - 1; i++) {
        const a = pts[i] as Point
        const b = pts[i + 1] as Point
        dx.push(b[0] - a[0])
        slope.push((b[1] - a[1]) / (b[0] - a[0]))
    }
    const m: number[] = new Array(n).fill(0)
    m[0] = slope[0] as number
    m[n - 1] = slope[n - 2] as number
    for (let i = 1; i < n - 1; i++) {
        const s0 = slope[i - 1] as number
        const s1 = slope[i] as number
        // Tangente nula onde a inclinação muda de sinal: evita estourar entre pontos.
        m[i] = s0 * s1 <= 0 ? 0 : (s0 + s1) / 2
    }
    for (let i = 0; i < n - 1; i++) {
        const s = slope[i] as number
        if (s === 0) {
            m[i] = 0
            m[i + 1] = 0
            continue
        }
        const a = (m[i] as number) / s
        const b = (m[i + 1] as number) / s
        const h = Math.hypot(a, b)
        if (h > 3) {
            m[i] = (3 * a * s) / h
            m[i + 1] = (3 * b * s) / h
        }
    }

    let i = 0
    while (i < n - 2 && x > (pts[i + 1] as Point)[0]) i++
    const p0 = pts[i] as Point
    const p1 = pts[i + 1] as Point
    const h = dx[i] as number
    const t = (x - p0[0]) / h
    const t2 = t * t
    const t3 = t2 * t
    const y =
        (2 * t3 - 3 * t2 + 1) * p0[1] +
        (t3 - 2 * t2 + t) * h * (m[i] as number) +
        (-2 * t3 + 3 * t2) * p1[1] +
        (t3 - t2) * h * (m[i + 1] as number)
    return Math.min(1, Math.max(0, y))
}

/** LUT 256x1 RGBA8: cada canal já compõe a curva mestre (rgb) e a do próprio canal. */
export const buildCurveLut = (
    curves: CurveSet,
    out: Uint8Array = new Uint8Array(256 * 4),
): Uint8Array => {
    for (let i = 0; i < 256; i++) {
        const master = evalCurve(curves.rgb, i / 255)
        out[i * 4] = Math.round(evalCurve(curves.r, master) * 255)
        out[i * 4 + 1] = Math.round(evalCurve(curves.g, master) * 255)
        out[i * 4 + 2] = Math.round(evalCurve(curves.b, master) * 255)
        out[i * 4 + 3] = 255
    }
    return out
}

/** Mistura duas curvas amostrando a união dos x (usado na intensidade do preset). */
export const blendCurve = (from: readonly Point[], to: readonly Point[], t: number): Point[] => {
    if (t <= 0) return from.map((p) => [...p] as Point)
    if (t >= 1) return to.map((p) => [...p] as Point)
    const xs = [...new Set([...from.map((p) => p[0]), ...to.map((p) => p[0])])].sort(
        (a, b) => a - b,
    )
    return xs.map((x) => [x, evalCurve(from, x) * (1 - t) + evalCurve(to, x) * t] as Point)
}

export const blendCurves = (from: CurveSet, to: CurveSet, t: number): CurveSet => ({
    rgb: blendCurve(from.rgb, to.rgb, t),
    r: blendCurve(from.r, to.r, t),
    g: blendCurve(from.g, to.g, t),
    b: blendCurve(from.b, to.b, t),
})
