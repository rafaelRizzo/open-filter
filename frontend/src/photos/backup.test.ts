// Testes do backup: ZIP com originais e manifesto, restauração, params inválidos e fotos corrompidas.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultParams } from '@/editor/params'

vi.mock('./decode', () => ({
    decodePhoto: vi.fn(async (blob: Blob) => {
        if (blob.size === 3) throw new Error('corrompida')
        return { preview: { close: vi.fn() }, width: 40, height: 30 }
    }),
}))
vi.mock('./thumbnail', () => ({ makeThumbnail: vi.fn(async () => new Blob(['thumb'])) }))

// O fake-indexeddb devolve Blob sem arrayBuffer(); a listagem do backup é simulada, o resto usa o banco falso.
vi.mock('./db', async (importOriginal) => {
    const original = await importOriginal<typeof import('./db')>()
    return { ...original, listPhotos: vi.fn(original.listPhotos) }
})

import { createBackup, restoreBackup } from './backup'
import { deletePhoto, getPhoto, listPhotos, type PhotoRecord } from './db'
import { createZip, readZip } from './zip'

const record = (id: string, type = 'image/jpeg', size = 8): PhotoRecord => ({
    id,
    originalBlob: new Blob(['x'.repeat(size)], { type }),
    thumbnailBlob: new Blob(['t']),
    name: `${id}.jpg`,
    width: 10,
    height: 20,
    params: { ...defaultParams(), exposure: 0.3 },
    updatedAt: 100,
})

const manifestZip = (photos: unknown[], files: Record<string, Blob> = {}) =>
    createZip([
        ...Object.entries(files).map(([name, data]) => ({ name, data })),
        { name: 'ajustes.json', data: new Blob([JSON.stringify({ version: 1, photos })]) },
    ])

const entry = (id: string, file: string, params: unknown = {}) => ({
    id,
    file,
    name: `${id}.jpg`,
    width: 1,
    height: 1,
    updatedAt: 5,
    params,
})

beforeEach(async () => {
    vi.mocked(listPhotos).mockClear()
    for (const id of ['a', 'b', 'ok', 'falta', 'ruim', 'p']) await deletePhoto(id)
})

describe('createBackup', () => {
    it('recusa quando não há fotos', async () => {
        vi.mocked(listPhotos).mockResolvedValueOnce([])
        await expect(createBackup()).rejects.toThrow('Não há fotos')
    })

    it('gera um zip que volta com as mesmas fotos e ajustes', async () => {
        vi.mocked(listPhotos).mockResolvedValueOnce([record('a'), record('b', 'image/png')])
        const { blob, count } = await createBackup()
        expect(count).toBe(2)
        expect(await restoreBackup(blob)).toBe(2)
        const a = await getPhoto('a')
        expect(a?.params.exposure).toBe(0.3)
        expect(a?.width).toBe(40)
        expect([...(await readZip(blob)).keys()]).toContain('fotos/b.png')
    })
})

describe('restoreBackup', () => {
    it('recusa zip sem ajustes.json', async () => {
        const zip = await createZip([{ name: 'qualquer.txt', data: new Blob(['x']) }])
        await expect(restoreBackup(zip)).rejects.toThrow('não é um backup')
    })

    it('manifesto de versão errada é recusado', async () => {
        const zip = await createZip([
            { name: 'ajustes.json', data: new Blob([JSON.stringify({ version: 2, photos: [] })]) },
        ])
        await expect(restoreBackup(zip)).rejects.toThrow()
    })

    it('pula foto ausente ou corrompida e restaura as outras', async () => {
        const zip = await manifestZip(
            [
                entry('ok', 'fotos/ok.jpg'),
                entry('falta', 'fotos/falta.jpg'),
                entry('ruim', 'fotos/ruim.jpg'),
            ],
            { 'fotos/ok.jpg': new Blob(['12345678']), 'fotos/ruim.jpg': new Blob(['abc']) },
        )
        expect(await restoreBackup(zip)).toBe(1)
        expect(await getPhoto('ok')).toBeDefined()
        expect(await getPhoto('falta')).toBeUndefined()
        expect(await getPhoto('ruim')).toBeUndefined()
    })

    it('params inválidos viram o padrão em vez de derrubar a restauração', async () => {
        const zip = await manifestZip([entry('p', 'fotos/p.jpg', { exposure: 999 })], {
            'fotos/p.jpg': new Blob(['12345678']),
        })
        expect(await restoreBackup(zip)).toBe(1)
        expect((await getPhoto('p'))?.params.exposure).toBe(0)
    })
})
