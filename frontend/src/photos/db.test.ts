// Testes do IndexedDB (fake-indexeddb): gravar, ler, ausente e ordenar por updatedAt desc.
import { describe, expect, it } from 'vitest'
import { defaultParams } from '@/editor/params'
import { getPhoto, listPhotos, type PhotoRecord, putPhoto } from './db'

const record = (id: string, updatedAt: number): PhotoRecord => ({
    id,
    originalBlob: new Blob(['o']),
    thumbnailBlob: new Blob(['t']),
    name: `${id}.jpg`,
    width: 10,
    height: 20,
    params: defaultParams(),
    updatedAt,
})

describe('photos db', () => {
    it('grava e lê uma foto', async () => {
        await putPhoto(record('a', 1))
        const found = await getPhoto('a')
        expect(found?.name).toBe('a.jpg')
        expect(found?.width).toBe(10)
    })

    it('devolve undefined para id inexistente', async () => {
        expect(await getPhoto('nope')).toBeUndefined()
    })

    it('atualiza ao gravar o mesmo id', async () => {
        await putPhoto(record('u', 1))
        await putPhoto({ ...record('u', 2), name: 'novo.jpg' })
        expect((await getPhoto('u'))?.name).toBe('novo.jpg')
    })

    it('lista da mais recente para a mais antiga', async () => {
        await putPhoto(record('old', 100))
        await putPhoto(record('new', 300))
        await putPhoto(record('mid', 200))
        const ids = (await listPhotos())
            .map((p) => p.id)
            .filter((id) => ['old', 'new', 'mid'].includes(id))
        expect(ids).toEqual(['new', 'mid', 'old'])
    })
})
