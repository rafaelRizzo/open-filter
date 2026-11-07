// Testes da geometria: schema, giro e espelho do corte, endireitar, tamanho final e arrastar a caixa.
import { describe, expect, it } from 'vitest'
import {
    ASPECTS,
    type Crop,
    cropIsFull,
    cropPixels,
    defaultGeometry,
    fitCropToRatio,
    flipGeometry,
    frameSize,
    geometryEqual,
    geometrySchema,
    isIdentityGeometry,
    MIN_CROP,
    moveCrop,
    normalizeCrop,
    outputSize,
    resizeCrop,
    rotateGeometry,
    straightenScale,
} from './geometry'

const full: Crop = { x: 0, y: 0, w: 1, h: 1 }

describe('schema e identidade', () => {
    it('o padrão é a foto inteira, sem giro nem redimensionar', () => {
        const g = defaultGeometry()
        expect(g.crop).toEqual(full)
        expect(g.rotate).toBe(0)
        expect(g.exportWidth).toBeNull()
        expect(isIdentityGeometry(g)).toBe(true)
        expect(cropIsFull(g.crop)).toBe(true)
    })

    it('rejeita corte que passa da borda, giro inválido e endireitar fora de ±30°', () => {
        expect(geometrySchema.safeParse({ crop: { x: 0.6, y: 0, w: 0.6, h: 1 } }).success).toBe(
            false,
        )
        expect(geometrySchema.safeParse({ rotate: 4 }).success).toBe(false)
        expect(geometrySchema.safeParse({ straighten: 31 }).success).toBe(false)
        expect(geometrySchema.safeParse({ exportWidth: 8 }).success).toBe(false)
        expect(
            geometrySchema.safeParse({ straighten: -30, rotate: 3, exportWidth: 1200 }).success,
        ).toBe(true)
    })

    it('geometryEqual vê cada campo e isIdentity vê qualquer mudança', () => {
        const g = defaultGeometry()
        expect(geometryEqual(g, defaultGeometry())).toBe(true)
        for (const change of [
            { rotate: 1 },
            { flipX: true },
            { flipY: true },
            { straighten: 1 },
            { exportWidth: 100 },
            { crop: { x: 0, y: 0, w: 0.5, h: 1 } },
        ]) {
            const other = { ...g, ...change }
            expect(geometryEqual(g, other)).toBe(false)
            expect(isIdentityGeometry(other)).toBe(false)
        }
    })
})

describe('quadro, endireitar e tamanhos', () => {
    it('quartos de volta ímpares trocam largura e altura do quadro', () => {
        expect(frameSize(600, 400, { rotate: 0 })).toEqual({ w: 600, h: 400 })
        expect(frameSize(600, 400, { rotate: 1 })).toEqual({ w: 400, h: 600 })
        expect(frameSize(600, 400, { rotate: 2 })).toEqual({ w: 600, h: 400 })
        expect(frameSize(600, 400, { rotate: 3 })).toEqual({ w: 400, h: 600 })
    })

    it('straightenScale: 1 sem giro, simétrico no sinal e cresce com o ângulo', () => {
        expect(straightenScale(600, 400, 0)).toBe(1)
        expect(straightenScale(600, 400, 5)).toBeCloseTo(straightenScale(600, 400, -5), 10)
        expect(straightenScale(600, 400, 10)).toBeGreaterThan(straightenScale(600, 400, 5))
        // quadrado a 45°: cos + sen = raiz de 2
        expect(straightenScale(500, 500, 45)).toBeCloseTo(Math.SQRT2, 10)
    })

    it('straightenScale cobre o quadro: o retângulo girado contém os cantos do quadro', () => {
        const [fw, fh, deg] = [600, 400, 12]
        const s = straightenScale(fw, fh, deg)
        const a = (deg * Math.PI) / 180
        // canto do quadro rotacionado de volta para o sistema da foto ampliada
        const cx = fw / 2
        const cy = fh / 2
        const rx = Math.abs(cx * Math.cos(a) + cy * Math.sin(a))
        const ry = Math.abs(-cx * Math.sin(a) + cy * Math.cos(a))
        expect(rx).toBeLessThanOrEqual((fw * s) / 2 + 1e-9)
        expect(ry).toBeLessThanOrEqual((fh * s) / 2 + 1e-9)
    })

    it('cropPixels e outputSize respeitam o corte e o redimensionar', () => {
        const g = { ...defaultGeometry(), crop: { x: 0.1, y: 0.1, w: 0.5, h: 0.5 } }
        expect(cropPixels(600, 400, g)).toEqual({ w: 300, h: 200 })
        expect(outputSize(600, 400, g)).toEqual({ w: 300, h: 200 })
        expect(outputSize(600, 400, { ...g, exportWidth: 150 })).toEqual({ w: 150, h: 100 })
        expect(outputSize(600, 400, { ...g, exportWidth: 1200 })).toEqual({ w: 1200, h: 800 })
        // com giro de 90° o corte é medido no quadro girado
        expect(cropPixels(600, 400, { ...defaultGeometry(), rotate: 1 })).toEqual({
            w: 400,
            h: 600,
        })
    })
})

describe('normalizeCrop e proporção', () => {
    it('prende o corte dentro do quadro e com tamanho mínimo', () => {
        expect(normalizeCrop({ x: 0.9, y: 0.9, w: 0.5, h: 0.5 })).toEqual({
            x: 0.5,
            y: 0.5,
            w: 0.5,
            h: 0.5,
        })
        expect(normalizeCrop({ x: -1, y: -1, w: 0.2, h: 0.2 })).toEqual({
            x: 0,
            y: 0,
            w: 0.2,
            h: 0.2,
        })
        expect(normalizeCrop({ x: 0, y: 0, w: 0, h: 5 })).toEqual({ x: 0, y: 0, w: MIN_CROP, h: 1 })
    })

    it('fitCropToRatio deixa a proporção em px certa, centrada e dentro do quadro', () => {
        const c = fitCropToRatio(full, 1, 600, 400)
        expect((c.w * 600) / (c.h * 400)).toBeCloseTo(1, 6)
        expect(c.x + c.w / 2).toBeCloseTo(0.5, 6)
        expect(c.x).toBeGreaterThanOrEqual(0)
        expect(c.x + c.w).toBeLessThanOrEqual(1 + 1e-9)
        const wide = fitCropToRatio(full, 16 / 9, 400, 600)
        expect((wide.w * 400) / (wide.h * 600)).toBeCloseTo(16 / 9, 6)
    })

    it('as opções de proporção têm o conjunto esperado', () => {
        expect(ASPECTS.map((a) => a.id)).toEqual([
            'free',
            'original',
            '1:1',
            '4:5',
            '5:4',
            '3:2',
            '2:3',
            '16:9',
            '9:16',
        ])
    })
})

describe('rotateGeometry e flipGeometry', () => {
    const half = { ...defaultGeometry(), crop: { x: 0, y: 0, w: 0.5, h: 1 } }

    it('girar no sentido horário leva o corte junto', () => {
        const r = rotateGeometry(half, 'cw')
        expect(r.rotate).toBe(1)
        expect(r.crop).toEqual({ x: 0, y: 0, w: 1, h: 0.5 })
    })

    it('ccw desfaz cw, e quatro giros voltam ao início', () => {
        expect(rotateGeometry(rotateGeometry(half, 'cw'), 'ccw')).toEqual(half)
        let g = half
        for (let i = 0; i < 4; i++) g = rotateGeometry(g, 'cw')
        expect(g).toEqual(half)
    })

    it('espelho horizontal inverte x do corte e liga flipX (giro 0)', () => {
        const f = flipGeometry(half, 'h')
        expect(f.flipX).toBe(true)
        expect(f.flipY).toBe(false)
        expect(f.crop).toEqual({ x: 0.5, y: 0, w: 0.5, h: 1 })
    })

    it('com a foto girada em 90°, o espelho horizontal da tela é o vertical da foto', () => {
        const f = flipGeometry({ ...defaultGeometry(), rotate: 1 }, 'h')
        expect(f.flipY).toBe(true)
        expect(f.flipX).toBe(false)
    })

    it('espelhar duas vezes volta ao mesmo', () => {
        for (const axis of ['h', 'v'] as const)
            expect(flipGeometry(flipGeometry(half, axis), axis)).toEqual(half)
    })
})

describe('moveCrop e resizeCrop', () => {
    const box: Crop = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }

    it('mover respeita as bordas do quadro', () => {
        expect(moveCrop(box, 0.1, -0.05)).toEqual({
            x: 0.30000000000000004,
            y: 0.15000000000000002,
            w: 0.4,
            h: 0.4,
        })
        expect(moveCrop(box, 5, 5)).toEqual({ x: 0.6, y: 0.6, w: 0.4, h: 0.4 })
        expect(moveCrop(box, -5, -5)).toEqual({ x: 0, y: 0, w: 0.4, h: 0.4 })
    })

    it('alça livre: cada borda mexe só no seu lado e para na borda do quadro', () => {
        expect(resizeCrop(box, 'e', 0.2, 0, null, 600, 400)).toMatchObject({
            x: 0.2,
            w: expect.closeTo(0.6, 10),
        })
        expect(
            resizeCrop(box, 'e', 5, 0, null, 600, 400).x +
                resizeCrop(box, 'e', 5, 0, null, 600, 400).w,
        ).toBeCloseTo(1, 10)
        expect(resizeCrop(box, 'w', -0.1, 0, null, 600, 400)).toMatchObject({
            x: expect.closeTo(0.1, 10),
            w: expect.closeTo(0.5, 10),
        })
        const n = resizeCrop(box, 'n', 0, 0.1, null, 600, 400)
        expect(n.y).toBeCloseTo(0.3, 10)
        expect(n.h).toBeCloseTo(0.3, 10)
    })

    it('nunca fica menor que o mínimo, mesmo arrastando a borda além da oposta', () => {
        const c = resizeCrop(box, 'e', -5, 0, null, 600, 400)
        expect(c.w).toBeGreaterThanOrEqual(MIN_CROP)
    })

    it('canto com proporção travada mantém a proporção em px e ancora o canto oposto', () => {
        const start: Crop = { x: 0.2, y: 0.2, w: 0.4, h: 0.6 } // 240x240 px num quadro 600x400: 1:1
        const c = resizeCrop(start, 'se', 0.1, 0, 1, 600, 400)
        expect((c.w * 600) / (c.h * 400)).toBeCloseTo(1, 6)
        expect(c.x).toBeCloseTo(0.2, 10)
        expect(c.y).toBeCloseTo(0.2, 10)
        const nw = resizeCrop(start, 'nw', -0.05, 0, 1, 600, 400)
        expect((nw.w * 600) / (nw.h * 400)).toBeCloseTo(1, 6)
        expect(nw.x + nw.w).toBeCloseTo(0.6, 10)
        expect(nw.y + nw.h).toBeCloseTo(0.8, 10)
    })

    it('com proporção travada, esticar além do quadro encolhe os dois lados e ainda cabe', () => {
        const c = resizeCrop({ x: 0, y: 0, w: 0.4, h: 0.6 }, 'se', 5, 5, 1, 600, 400)
        expect(c.x + c.w).toBeLessThanOrEqual(1 + 1e-9)
        expect(c.y + c.h).toBeLessThanOrEqual(1 + 1e-9)
        expect((c.w * 600) / (c.h * 400)).toBeCloseTo(1, 6)
    })
})
