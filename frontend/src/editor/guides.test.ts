// Testes das grades: segmentos, ciclo de grades, espiral áurea e orientações.
import { describe, expect, it } from 'vitest'
import {
    baseSpiralOrientation,
    GOLDEN,
    GRID_KINDS,
    GRID_LABELS,
    type GridKind,
    goldenFigure,
    gridSegments,
    nextGrid,
    orientPoint,
    PHI,
    SPIRAL_ORIENTATIONS,
} from './guides'

describe('grades', () => {
    it('todas têm rótulo e o ciclo volta ao início', () => {
        for (const k of GRID_KINDS) expect(GRID_LABELS[k]).toBeTruthy()
        let k: GridKind = GRID_KINDS[0]
        const seen: GridKind[] = [k]
        for (let i = 0; i < GRID_KINDS.length; i++) {
            k = nextGrid(k)
            seen.push(k)
        }
        expect(seen[GRID_KINDS.length]).toBe(GRID_KINDS[0])
        expect(new Set(seen).size).toBe(GRID_KINDS.length)
    })

    it('constantes áureas', () => {
        expect(PHI).toBeCloseTo(1.618034, 6)
        expect(GOLDEN[0] + GOLDEN[1]).toBeCloseTo(1, 10)
        expect(GOLDEN[1]).toBeCloseTo(0.618034, 6)
    })

    it('segmentos por tipo', () => {
        expect(gridSegments('off', 100, 50)).toEqual([])
        expect(gridSegments('golden', 100, 50)).toEqual([])
        expect(gridSegments('thirds', 90, 60)).toHaveLength(4)
        expect(gridSegments('center', 100, 50)).toHaveLength(4)
        expect(gridSegments('phi', 100, 50)).toHaveLength(4)
        expect(gridSegments('diagonals', 100, 50)).toEqual([
            { x1: 0, y1: 0, x2: 100, y2: 50 },
            { x1: 0, y1: 50, x2: 100, y2: 0 },
        ])
    })

    it('terços ficam em 1/3 e 2/3 e cobrem a altura/largura toda', () => {
        const s = gridSegments('thirds', 90, 60)
        expect(s[0]).toEqual({ x1: 30, y1: 0, x2: 30, y2: 60 })
        expect(s[1]).toEqual({ x1: 60, y1: 0, x2: 60, y2: 60 })
        expect(s[2]).toEqual({ x1: 0, y1: 20, x2: 90, y2: 20 })
    })

    it('grade phi usa 38,2% e 61,8%', () => {
        const s = gridSegments('phi', 1000, 1000)
        expect(s[0]?.x1).toBeCloseTo(381.97, 1)
        expect(s[1]?.x1).toBeCloseTo(618.03, 1)
    })
})

describe('orientPoint', () => {
    it('0 é identidade e 1 a 3 giram 90° no sentido horário', () => {
        expect(orientPoint([0.2, 0.7], 0)).toEqual([0.2, 0.7])
        expect(orientPoint([0, 0], 1)).toEqual([1, 0])
        expect(orientPoint([0, 0], 2)).toEqual([1, 1])
        expect(orientPoint([0, 0], 3)).toEqual([0, 1])
    })

    it('4 a 7 espelham em x antes de girar', () => {
        expect(orientPoint([0.2, 0.7], 4)).toEqual([0.8, 0.7])
    })

    it('mantém o ponto dentro do quadrado unitário em todas as orientações', () => {
        for (let o = 0; o < SPIRAL_ORIENTATIONS; o++) {
            const [x, y] = orientPoint([0.3, 0.9], o)
            expect(x).toBeGreaterThanOrEqual(0)
            expect(x).toBeLessThanOrEqual(1)
            expect(y).toBeGreaterThanOrEqual(0)
            expect(y).toBeLessThanOrEqual(1)
        }
    })
})

describe('goldenFigure', () => {
    it('tem 9 quadrados e uma polilinha contínua', () => {
        const { spiral, squares } = goldenFigure()
        expect(squares).toHaveLength(9)
        expect(spiral.length).toBe(28 * 9 + 1)
        for (let i = 1; i < spiral.length; i++) {
            const [ax, ay] = spiral[i - 1] as [number, number]
            const [bx, by] = spiral[i] as [number, number]
            expect(Math.hypot(bx - ax, by - ay)).toBeLessThan(0.2)
        }
    })

    it('fica dentro da foto: espiral e linhas em 0..1', () => {
        for (let o = 0; o < SPIRAL_ORIENTATIONS; o++) {
            const { spiral, squares } = goldenFigure(o)
            for (const [x, y] of spiral) {
                expect(x).toBeGreaterThanOrEqual(-1e-9)
                expect(x).toBeLessThanOrEqual(1 + 1e-9)
                expect(y).toBeGreaterThanOrEqual(-1e-9)
                expect(y).toBeLessThanOrEqual(1 + 1e-9)
            }
            for (const q of squares) for (const v of q) expect(v).toBeGreaterThanOrEqual(-1e-9)
        }
    })

    it('a primeira divisória na orientação 0 fica em x = 1/φ (quadrado à esquerda)', () => {
        const [x1, , x2] = goldenFigure(0).squares[0] as [number, number, number, number]
        expect(x1).toBeCloseTo(1 / PHI, 6)
        expect(x2).toBeCloseTo(1 / PHI, 6)
    })

    it('orientação 4 é o espelho horizontal da 0', () => {
        const a = goldenFigure(0).spiral
        const b = goldenFigure(4).spiral
        a.forEach(([x, y], i) => {
            expect(b[i]?.[0]).toBeCloseTo(1 - x, 10)
            expect(b[i]?.[1]).toBeCloseTo(y, 10)
        })
    })

    it('orientação inicial: retrato 1, paisagem e quadrado 0', () => {
        expect(baseSpiralOrientation(400, 600)).toBe(1)
        expect(baseSpiralOrientation(600, 400)).toBe(0)
        expect(baseSpiralOrientation(500, 500)).toBe(0)
    })
})
