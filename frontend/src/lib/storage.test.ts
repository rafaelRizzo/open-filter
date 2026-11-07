// Testes do formatBytes e da persistência de armazenamento.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBytes, requestPersistence } from './storage'

describe('formatBytes', () => {
    it('escolhe a unidade e a casa decimal', () => {
        expect(formatBytes(0)).toBe('0 B')
        expect(formatBytes(1023)).toBe('1023 B')
        expect(formatBytes(1024)).toBe('1.0 KB')
        expect(formatBytes(1536)).toBe('1.5 KB')
        expect(formatBytes(15 * 1024 * 1024)).toBe('15 MB')
        expect(formatBytes(3.8 * 1024 ** 3)).toBe('3.8 GB')
        expect(formatBytes(5000 * 1024 ** 4)).toBe('5000 TB')
    })
})

describe('requestPersistence', () => {
    afterEach(() => vi.unstubAllGlobals())

    const stub = (storage: object | undefined) =>
        vi.stubGlobal('navigator', { ...navigator, storage })

    it('false sem suporte', async () => {
        stub(undefined)
        expect(await requestPersistence()).toBe(false)
    })

    it('true direto quando já está persistido, sem pedir de novo', async () => {
        const persist = vi.fn()
        stub({ persist, persisted: async () => true })
        expect(await requestPersistence()).toBe(true)
        expect(persist).not.toHaveBeenCalled()
    })

    it('pede e devolve a resposta do navegador', async () => {
        stub({ persist: async () => false, persisted: async () => false })
        expect(await requestPersistence()).toBe(false)
        stub({ persist: async () => true })
        expect(await requestPersistence()).toBe(true)
    })
})
