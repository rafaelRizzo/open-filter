// Testes da miniatura: escala pelo maior lado (320px), nunca amplia, erro sem canvas 2D.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeThumbnail } from './thumbnail'

const drawImage = vi.fn()
const convertToBlob = vi.fn().mockResolvedValue(new Blob(['t'], { type: 'image/jpeg' }))
let ctxAvailable = true

class FakeOffscreenCanvas {
    width: number
    height: number
    constructor(width: number, height: number) {
        this.width = width
        this.height = height
    }
    getContext() {
        return ctxAvailable ? { drawImage } : null
    }
    convertToBlob = convertToBlob
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    ctxAvailable = true
})

const bmp = (width: number, height: number) => ({ width, height }) as ImageBitmap

describe('makeThumbnail', () => {
    it('reduz foto grande para 320 no maior lado', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
        const blob = await makeThumbnail(bmp(3200, 1600))
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 320, 160)
        expect(convertToBlob).toHaveBeenCalledWith({ type: 'image/jpeg', quality: 0.8 })
        expect(blob.type).toBe('image/jpeg')
    })

    it('não amplia foto menor que 320', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
        await makeThumbnail(bmp(100, 50))
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50)
    })

    it('nunca gera canvas com lado 0', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
        await makeThumbnail(bmp(100000, 1))
        expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 320, 1)
    })

    it('lança se o canvas 2D estiver indisponível', async () => {
        vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas)
        ctxAvailable = false
        await expect(makeThumbnail(bmp(10, 10))).rejects.toThrow(/Canvas 2D/)
    })
})
