// Testes do parser de .cube: cabeçalho, ordem dos canais, domínio e erros.
import { describe, expect, it } from 'vitest'
import { parseCube } from './lut'

const identity2 = [
    'LUT_3D_SIZE 2',
    '0 0 0',
    '1 0 0',
    '0 1 0',
    '1 1 0',
    '0 0 1',
    '1 0 1',
    '0 1 1',
    '1 1 1',
].join('\n')

const px = (data: Uint8Array, size: number, r: number, g: number, b: number) => {
    const o = (g * size * size + b * size + r) * 4
    return [data[o], data[o + 1], data[o + 2], data[o + 3]]
}

describe('parseCube', () => {
    it('lê um LUT identidade e posiciona cada cor na fatia certa', () => {
        const lut = parseCube(identity2)
        expect(lut.size).toBe(2)
        expect(lut.name).toBe('LUT')
        expect(lut.data).toHaveLength(2 * 2 * 2 * 4)
        for (const [r, g, b] of [
            [0, 0, 0],
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 1],
        ] as const)
            expect(px(lut.data, 2, r, g, b)).toEqual([r * 255, g * 255, b * 255, 255])
    })

    it('usa TITLE, ignora comentários, linhas vazias e CRLF', () => {
        const text = `# comentário\r\nTITLE "Filme Quente"\r\n\r\n${identity2.replace(/\n/g, '\r\n')}`
        expect(parseCube(text).name).toBe('Filme Quente')
        expect(parseCube(`TITLE ""\n${identity2}`, 'arquivo').name).toBe('arquivo')
        expect(parseCube(identity2, 'meu.cube').name).toBe('meu.cube')
    })

    it('normaliza pelo DOMAIN e prende em 0..255', () => {
        const text = `DOMAIN_MIN 0 0 0\nDOMAIN_MAX 2 2 2\n${identity2}`
        const lut = parseCube(text)
        expect(px(lut.data, 2, 1, 1, 1)).toEqual([128, 128, 128, 255])
        const over = parseCube(identity2.replace('1 1 1', '3 -1 0.5'))
        expect(px(over.data, 2, 1, 1, 1)).toEqual([255, 0, 128, 255])
    })

    it('rejeita LUT 1D, tamanho inválido e contagem errada', () => {
        expect(() => parseCube('LUT_1D_SIZE 4\n0 0 0')).toThrow('1D')
        expect(() => parseCube('0 0 0')).toThrow('tamanho')
        expect(() => parseCube('LUT_3D_SIZE 1\n0 0 0')).toThrow('tamanho')
        expect(() => parseCube('LUT_3D_SIZE 66\n0 0 0')).toThrow('tamanho')
        expect(() => parseCube('LUT_3D_SIZE 2\n0 0 0')).toThrow('quantidade')
    })
})
