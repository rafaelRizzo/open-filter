// Testes do cálculo do histograma: contagem por canal, luma e clipping.
import { describe, expect, it } from 'vitest'
import { computeHistogram } from './histogram'

describe('computeHistogram', () => {
    it('vazio não divide por zero', () => {
        const h = computeHistogram(new Uint8Array(0))
        expect(h.clipHigh).toBe(0)
        expect(h.clipLow).toBe(0)
        expect(h.r).toHaveLength(256)
    })

    it('conta por canal e calcula a luma', () => {
        const h = computeHistogram(new Uint8ClampedArray([10, 20, 30, 255, 10, 20, 30, 255]))
        expect(h.r[10]).toBe(2)
        expect(h.g[20]).toBe(2)
        expect(h.b[30]).toBe(2)
        expect(h.luma[Math.round(0.2126 * 10 + 0.7152 * 20 + 0.0722 * 30)]).toBe(2)
    })

    it('mede a fração estourada e a esmagada', () => {
        // branco, preto, cinza, vermelho puro (alto e baixo ao mesmo tempo)
        const h = computeHistogram(
            new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255, 128, 128, 128, 255, 255, 0, 0, 255]),
        )
        expect(h.clipHigh).toBe(0.5)
        expect(h.clipLow).toBe(0.5)
    })
})
