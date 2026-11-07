// Persistência do cache do TanStack Query no IndexedDB: abre rápido e permite ler presets offline.
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { Query } from '@tanstack/react-query'
import { openDB } from 'idb'

const dbPromise = openDB('open-filter-cache', 1, {
    upgrade(db) {
        db.createObjectStore('kv')
    },
})

const storage = {
    getItem: async (key: string) =>
        ((await (await dbPromise).get('kv', key)) as string | undefined) ?? null,
    setItem: async (key: string, value: string) => {
        await (await dbPromise).put('kv', value, key)
    },
    removeItem: async (key: string) => {
        await (await dbPromise).delete('kv', key)
    },
}

export const persister = createAsyncStoragePersister({
    storage,
    key: 'open-filter-query-cache',
    throttleTime: 1000,
})

/** 7 dias: o gcTime das queries precisa ser pelo menos isso para o cache persistido valer. */
export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000

// Só presets: fotos têm Blobs grandes e já vivem no IndexedDB próprio.
export const shouldPersist = (query: Query) =>
    query.queryKey[0] === 'presets' && query.state.status === 'success'
