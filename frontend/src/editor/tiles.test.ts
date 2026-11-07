// Testes do plano de tiles: cobertura sem furo nem sobreposição, halo e limites do canvas.
import { describe, expect, it } from 'vitest'
import {
    assertExportable,
    MAX_CANVAS_AREA,
    MAX_CANVAS_SIDE,
    planTiles,
    TILE_HALO,
    TILE_MAX_SIDE,
} from './tiles'

describe('assertExportable', () => {
    it('aceita no limite e recusa acima', () => {
        expect(() => assertExportable(16384, 16384)).not.toThrow()
        expect(() => assertExportable(MAX_CANVAS_SIDE + 1, 10)).toThrow('grande demais')
        expect(() => assertExportable(10, MAX_CANVAS_SIDE + 1)).toThrow('grande demais')
        expect(() => assertExportable(16384, 16385)).toThrow()
        expect(MAX_CANVAS_AREA).toBe(16384 * 16384)
    })
})

describe('planTiles', () => {
    it('imagem pequena vira um tile sem halo', () => {
        expect(planTiles(100, 50, 8192)).toEqual([
            { x: 0, y: 0, w: 100, h: 50, cx: 0, cy: 0, cw: 100, ch: 50 },
        ])
    })

    it('cobre cada pixel exatamente uma vez', () => {
        const w = 5000
        const h = 700
        const tiles = planTiles(w, h, 2048)
        expect(tiles.length).toBeGreaterThan(1)
        const area = tiles.reduce((n, t) => n + t.w * t.h, 0)
        expect(area).toBe(w * h)
        for (const t of tiles) {
            expect(t.x + t.w).toBeLessThanOrEqual(w)
            expect(t.y + t.h).toBeLessThanOrEqual(h)
        }
    })

    it('o recorte tem halo nas bordas internas e nunca passa da textura nem da imagem', () => {
        const max = 1024
        const tiles = planTiles(3000, 2500, max)
        for (const t of tiles) {
            expect(t.cw).toBeLessThanOrEqual(max)
            expect(t.ch).toBeLessThanOrEqual(max)
            expect(t.cx).toBe(Math.max(0, t.x - TILE_HALO))
            expect(t.cy).toBe(Math.max(0, t.y - TILE_HALO))
            expect(t.cx + t.cw).toBeLessThanOrEqual(3000)
            expect(t.cy + t.ch).toBeLessThanOrEqual(2500)
            expect(t.cx).toBeLessThanOrEqual(t.x)
            expect(t.cx + t.cw).toBeGreaterThanOrEqual(t.x + t.w)
        }
    })

    it('respeita o teto de lado do tile mesmo com GPU enorme', () => {
        const tiles = planTiles(10000, 100, 32768)
        for (const t of tiles) expect(t.w).toBeLessThanOrEqual(TILE_MAX_SIDE - TILE_HALO * 2)
    })

    it('GPU minúscula é erro', () => {
        expect(() => planTiles(100, 100, TILE_HALO * 2)).toThrow('GPU')
    })
})
