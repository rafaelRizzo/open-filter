// Acesso ao IndexedDB (lib idb). A foto original fica aqui como Blob e nunca sai do navegador.
import { type DBSchema, openDB } from 'idb'
import type { EditParams } from '@/editor/params'

export type PhotoRecord = {
    id: string
    originalBlob: Blob
    thumbnailBlob: Blob
    name: string
    width: number
    height: number
    params: EditParams
    updatedAt: number
}

interface PhotosDB extends DBSchema {
    photos: { key: string; value: PhotoRecord; indexes: { 'by-updated': number } }
}

const dbPromise = openDB<PhotosDB>('open-filter', 1, {
    upgrade(db) {
        const store = db.createObjectStore('photos', { keyPath: 'id' })
        store.createIndex('by-updated', 'updatedAt')
    },
})

export const putPhoto = async (photo: PhotoRecord) => {
    await (await dbPromise).put('photos', photo)
}

export const getPhoto = async (id: string) => (await dbPromise).get('photos', id)

export const listPhotos = async () => {
    const all = await (await dbPromise).getAllFromIndex('photos', 'by-updated')
    return all.reverse()
}

/** Atualiza só os ajustes e a data (o Blob original não é regravado). */
export const updatePhotoParams = async (
    id: string,
    params: EditParams,
): Promise<PhotoRecord | undefined> => {
    const db = await dbPromise
    const tx = db.transaction('photos', 'readwrite')
    const current = await tx.store.get(id)
    if (!current) return undefined
    const next = { ...current, params, updatedAt: Date.now() }
    await tx.store.put(next)
    await tx.done
    return next
}

/** Marca a foto como a mais recente (aberta no editor): só mexe na data, nada mais. */
export const touchPhoto = async (id: string) => {
    const db = await dbPromise
    const tx = db.transaction('photos', 'readwrite')
    const current = await tx.store.get(id)
    if (current) await tx.store.put({ ...current, updatedAt: Date.now() })
    await tx.done
}

export const deletePhoto = async (id: string) => {
    await (await dbPromise).delete('photos', id)
}
