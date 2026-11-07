// Testes do decode: EXIF via imageOrientation, preview reduzido só quando passa de 2048px.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { decodePhoto, PREVIEW_MAX_SIDE } from './decode'

const bitmap = (width: number, height: number) => ({ width, height, close: vi.fn() })

afterEach(() => vi.unstubAllGlobals())

describe('decodePhoto', () => {
    it('foto pequena: devolve o próprio bitmap, sem redimensionar', async () => {
        const full = bitmap(1000, 500)
        const create = vi.fn().mockResolvedValue(full)
        vi.stubGlobal('createImageBitmap', create)

        const result = await decodePhoto(new Blob(['x']))

        expect(create).toHaveBeenCalledTimes(1)
        expect(create).toHaveBeenCalledWith(expect.any(Blob), { imageOrientation: 'from-image' })
        expect(result).toEqual({ preview: full, width: 1000, height: 500 })
        expect(full.close).not.toHaveBeenCalled()
    })

    it('foto grande: reduz o maior lado a 2048, mantém dimensões reais e fecha o bitmap cheio', async () => {
        const full = bitmap(4096, 3072)
        const small = bitmap(2048, 1536)
        const create = vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce(small)
        vi.stubGlobal('createImageBitmap', create)

        const result = await decodePhoto(new Blob(['x']))

        expect(create).toHaveBeenLastCalledWith(full, {
            resizeWidth: 2048,
            resizeHeight: 1536,
            resizeQuality: 'high',
        })
        expect(full.close).toHaveBeenCalledOnce()
        expect(result).toEqual({ preview: small, width: 4096, height: 3072 })
    })

    it('retrato grande: o lado maior (altura) é que vai a 2048', async () => {
        const full = bitmap(3000, 6000)
        const create = vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce(bitmap(1024, 2048))
        vi.stubGlobal('createImageBitmap', create)

        await decodePhoto(new Blob(['x']))

        expect(create).toHaveBeenLastCalledWith(
            full,
            expect.objectContaining({ resizeWidth: 1024, resizeHeight: 2048 }),
        )
    })

    it('exatamente 2048: não reduz', async () => {
        const full = bitmap(PREVIEW_MAX_SIDE, 100)
        const create = vi.fn().mockResolvedValue(full)
        vi.stubGlobal('createImageBitmap', create)
        await decodePhoto(new Blob(['x']))
        expect(create).toHaveBeenCalledTimes(1)
    })

    it('propaga erro de imagem inválida', async () => {
        vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad image')))
        await expect(decodePhoto(new Blob(['x']))).rejects.toThrow('bad image')
    })
})
