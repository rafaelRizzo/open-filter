// Armazenamento do navegador: pede persistência (evita limpeza automática) e mostra o uso.
import { useCallback, useEffect, useState } from 'react'

export type StorageInfo = { usage: number; quota: number; persisted: boolean; supported: boolean }

export const readStorage = async (): Promise<StorageInfo> => {
    if (!navigator.storage?.estimate)
        return { usage: 0, quota: 0, persisted: false, supported: false }
    const [estimate, persisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted?.() ?? Promise.resolve(false),
    ])
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted, supported: true }
}

/** Espaço livre estimado (0 se o navegador não informa). */
export const freeBytes = (info: StorageInfo) =>
    info.supported ? Math.max(0, info.quota - info.usage) : 0

/** Gravar estourou a cota do navegador. */
export const isQuotaError = (e: unknown) =>
    e instanceof DOMException && e.name === 'QuotaExceededError'

/** Pede ao navegador para não apagar os dados do site. Pode ser negado; devolve o resultado. */
export const requestPersistence = async (): Promise<boolean> => {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return navigator.storage.persist()
}

/** Abaixo disso (Safari, celular, disco quase cheio) o navegador pode ficar sem espaço rápido. */
export const LOW_QUOTA_BYTES = 1024 ** 3

export const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    const units = ['KB', 'MB', 'GB', 'TB']
    let v = bytes / 1024
    let i = 0
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
    }
    return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`
}

export const useStorageInfo = () => {
    const [info, setInfo] = useState<StorageInfo | null>(null)
    const refresh = useCallback(() => {
        readStorage().then(setInfo, () =>
            setInfo({ usage: 0, quota: 0, persisted: false, supported: false }),
        )
    }, [])
    useEffect(refresh, [refresh])
    return { info, refresh }
}
