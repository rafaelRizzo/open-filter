// Revela uma lista em páginas: mostra as primeiras N e libera mais quando o sentinela entra na área visível.
import { useCallback, useState } from 'react'

export function useReveal<T>(items: readonly T[], pageSize: number, resetKey?: unknown) {
    // Busca ou filtro novo (resetKey muda) volta para a primeira página.
    const [state, setState] = useState({ key: resetKey, count: pageSize })
    const count = state.key === resetKey ? state.count : pageSize
    const hasMore = count < items.length

    // Callback ref: troca de identidade a cada página, então o observer reinicia e dispara de novo
    // se o sentinela ainda estiver à vista (página curta ou tela alta).
    const sentinelRef = useCallback(
        (node: HTMLElement | null) => {
            if (!node || !hasMore) return
            const observer = new IntersectionObserver(
                (entries) => {
                    if (!entries.some((e) => e.isIntersecting)) return
                    observer.disconnect()
                    setState((s) => ({
                        key: resetKey,
                        count: (s.key === resetKey ? s.count : pageSize) + pageSize,
                    }))
                },
                { rootMargin: '240px' },
            )
            observer.observe(node)
            return () => observer.disconnect()
        },
        [hasMore, count, pageSize, resetKey],
    )

    // Libera páginas até o índice existir na lista (ex: rolar até o preset selecionado).
    const revealTo = useCallback(
        (index: number) =>
            setState((s) => {
                const base = s.key === resetKey ? s.count : pageSize
                return {
                    key: resetKey,
                    count: Math.max(base, Math.ceil((index + 1) / pageSize) * pageSize),
                }
            }),
        [pageSize, resetKey],
    )

    return { shown: hasMore ? items.slice(0, count) : items, hasMore, sentinelRef, revealTo }
}
