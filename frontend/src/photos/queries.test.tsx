// Testes dos hooks de fotos: leitura, erro de id ausente e importação (decode, miniatura, invalidação).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getPhoto } from './db'
import { photoQuery, photosQuery, useImportPhoto, usePhoto, usePhotos } from './queries'

const close = vi.fn()
vi.mock('./decode', () => ({
    decodePhoto: vi.fn(async () => ({ preview: { close }, width: 800, height: 600 })),
}))
vi.mock('./thumbnail', () => ({
    makeThumbnail: vi.fn(async () => new Blob(['thumb'], { type: 'image/jpeg' })),
}))

const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
    return { client, wrapper }
}

beforeEach(() => close.mockClear())

describe('photo queries', () => {
    it('usa as query keys padronizadas', () => {
        expect(photosQuery().queryKey).toEqual(['photos'])
        expect(photoQuery('x').queryKey).toEqual(['photos', 'x'])
    })

    it('importa: decodifica, gera miniatura, grava e invalida a lista', async () => {
        const { client, wrapper } = setup()
        const invalidate = vi.spyOn(client, 'invalidateQueries')
        const { result } = renderHook(() => useImportPhoto(), { wrapper })

        const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' })
        const record = await result.current.mutateAsync(file)

        expect(record).toMatchObject({ name: 'foto.jpg', width: 800, height: 600 })
        expect(record.params.exposure).toBe(0)
        expect(record.originalBlob).toBe(file)
        expect(close).toHaveBeenCalledOnce()
        expect((await getPhoto(record.id))?.name).toBe('foto.jpg')
        await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['photos'] }))
    })

    it('usePhoto lê a foto importada e usePhotos a lista', async () => {
        const { wrapper } = setup()
        const imp = renderHook(() => useImportPhoto(), { wrapper })
        const record = await imp.result.current.mutateAsync(new File(['i'], 'b.jpg'))

        const one = renderHook(() => usePhoto(record.id), { wrapper })
        await waitFor(() => expect(one.result.current.data?.name).toBe('b.jpg'))

        const list = renderHook(() => usePhotos(), { wrapper })
        await waitFor(() =>
            expect(list.result.current.data?.some((p) => p.id === record.id)).toBe(true),
        )
    })

    it('usePhoto de id inexistente vira erro', async () => {
        const { wrapper } = setup()
        const { result } = renderHook(() => usePhoto('nao-existe'), { wrapper })
        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error?.message).toMatch(/não encontrada/)
    })
})
