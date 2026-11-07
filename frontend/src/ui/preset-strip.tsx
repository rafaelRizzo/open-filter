// Presets com miniatura e filtro por categoria: faixa horizontal no celular, grade rolável no desktop.

import { Copy, Search, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import {
    type KeyboardEvent,
    type ReactNode,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { copyText } from '@/lib/clipboard'
import { useReveal } from '@/lib/use-reveal'
import { cn } from '@/lib/utils'
import { filterPresets, type Preset } from '@/presets/api'

const ALL = '__all__'
// 8 linhas de 3 por página.
const PAGE_SIZE = 24

type Props = {
    presets: readonly Preset[] | undefined
    thumbs: ReadonlyMap<string, string>
    selectedId: string | null
    loading: boolean
    error: boolean
    /** Mensagem quando a lista está vazia (ex: aba "Meus" sem presets). */
    emptyText?: string
    onSelect: (preset: Preset) => void
    /** Quando definido, o menu de contexto ganha "Excluir" (só para presets pessoais). */
    onDelete?: (preset: Preset) => void
    /** Fica entre os filtros e a grade (ex: intensidade do preset aplicado). */
    belowFilters?: ReactNode
}

export function PresetStrip({
    presets,
    thumbs,
    selectedId,
    loading,
    error,
    emptyText,
    onSelect,
    onDelete,
    belowFilters,
}: Props) {
    const uid = useId()
    const [query, setQuery] = useState('')
    const [category, setCategory] = useState<string | null>(null)
    // Categorias na ordem em que aparecem (a lista já vem ordenada por sort_order).
    const categories = useMemo(
        () => [...new Set((presets ?? []).flatMap((p) => (p.category ? [p.category] : [])))],
        [presets],
    )
    // Categoria que sumiu da lista (ex: trocou de aba) volta para "Todas".
    const activeCategory = category && categories.includes(category) ? category : null
    const visible = useMemo(() => {
        const byCategory = activeCategory
            ? (presets ?? []).filter((p) => p.category === activeCategory)
            : (presets ?? [])
        return filterPresets(byCategory, query)
    }, [presets, query, activeCategory])
    const { shown, hasMore, sentinelRef, revealTo } = useReveal(
        visible,
        PAGE_SIZE,
        `${activeCategory}|${query}|${presets?.length}`,
    )

    // Preset selecionado fora da lista (ex: reabriu a foto): libera as páginas até ele e centraliza.
    // Só uma vez por seleção: o scroll infinito não pode puxar o usuário de volta.
    const listRef = useRef<HTMLUListElement>(null)
    const scrolledFor = useRef<string | null>(null)
    useEffect(() => {
        if (!selectedId) {
            scrolledFor.current = null
            return
        }
        const ul = listRef.current
        if (!ul || scrolledFor.current === selectedId) return
        const index = visible.findIndex((p) => p.id === selectedId)
        if (index < 0) return
        if (index >= shown.length) return revealTo(index)
        const el = ul.querySelector<HTMLElement>(`[data-preset-index="${index}"]`)
        if (!el) return
        scrolledFor.current = selectedId
        const viewport = ul.closest<HTMLElement>('[data-slot="scroll-area-viewport"]')
        const box = el.getBoundingClientRect()
        if (viewport) {
            const vp = viewport.getBoundingClientRect()
            viewport.scrollTop += box.top - vp.top - (vp.height - box.height) / 2
        }
        const row = ul.getBoundingClientRect()
        ul.scrollLeft += box.left - row.left - (row.width - box.width) / 2
    }, [selectedId, visible, shown.length, revealTo])

    // Escolha feita aqui dentro: o preset já está à vista, então não recentraliza a lista.
    const pick = (preset: Preset) => {
        scrolledFor.current = preset.id
        onSelect(preset)
    }

    // Tabulação "roving": só um preset entra na ordem do Tab (o selecionado, ou o primeiro).
    const tabStopId = shown.some((p) => p.id === selectedId) ? selectedId : shown[0]?.id

    // Setas movem a seleção (e aplicam o preset): esquerda/direita andam 1, cima/baixo uma linha.
    const onGridKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
        const current = (e.target as HTMLElement).closest<HTMLElement>('[data-preset-index]')
        if (!current || e.altKey || e.ctrlKey || e.metaKey) return
        const columns = window.matchMedia('(min-width: 768px)').matches ? 3 : 1
        const from = Number(current.dataset.presetIndex)
        const step = new Map([
            ['ArrowRight', 1],
            ['ArrowLeft', -1],
            ['ArrowDown', columns],
            ['ArrowUp', -columns],
        ]).get(e.key)
        let to: number
        if (e.key === 'Home') to = 0
        else if (e.key === 'End') to = shown.length - 1
        // No celular (1 coluna) cima/baixo seguem com o scroll da página.
        else if (step !== undefined && (columns > 1 || Math.abs(step) === 1))
            to = Math.min(shown.length - 1, Math.max(0, from + step))
        else return
        e.preventDefault()
        const preset = shown[to]
        if (!preset || to === from) return
        pick(preset)
        e.currentTarget.querySelector<HTMLElement>(`[data-preset-index="${to}"]`)?.focus()
    }

    if (error)
        return (
            <p className="px-1 text-sm text-muted-foreground">Presets indisponíveis no momento.</p>
        )
    if (loading || !presets) {
        return (
            <div className="flex gap-2 md:grid md:grid-cols-3">
                {Array.from({ length: 5 }, (_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeletons estáticos
                    <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-lg md:w-full" />
                ))}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-2 md:min-h-0 md:flex-1">
            <div className="relative max-sm:hidden">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    maxLength={512}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar preset por nome ou ID"
                    aria-label="Buscar preset por nome ou ID"
                    className="pl-8"
                />
            </div>
            {categories.length > 1 && (
                <Select
                    value={activeCategory ?? ALL}
                    onValueChange={(v) => setCategory(v === ALL ? null : v)}
                    items={[
                        { value: ALL, label: 'Todas as categorias' },
                        ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                >
                    <SelectTrigger size="sm" className="w-full" aria-label="Categoria">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Todas as categorias</SelectItem>
                        {categories.map((c) => (
                            <SelectItem key={c} value={c}>
                                {c}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {belowFilters}
            {presets.length === 0 && emptyText ? (
                <p className="text-muted-foreground px-1 py-6 text-center text-sm">{emptyText}</p>
            ) : visible.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted-foreground">
                    Nenhum preset encontrado.
                </p>
            ) : (
                // Desktop: mesma barra de rolagem do painel de ajustes. Celular: faixa horizontal nativa.
                <ScrollArea
                    className="md:min-h-0 md:flex-1"
                    viewportClassName="md:min-h-0 md:flex-1"
                >
                    <ul
                        ref={listRef}
                        className="flex gap-2 overflow-x-auto p-1 md:grid md:grid-cols-3 md:content-start md:overflow-x-hidden md:pr-3"
                        aria-label="Presets"
                        onKeyDown={onGridKeyDown}
                    >
                        {shown.map((preset, i) => {
                            const thumb = thumbs.get(preset.id)
                            const selected = preset.id === selectedId
                            return (
                                <motion.li
                                    key={preset.id}
                                    className="shrink-0 md:shrink"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    // Atraso por posição dentro da página: as páginas seguintes não esperam o fim da fila.
                                    transition={{ delay: Math.min((i % PAGE_SIZE) * 0.04, 0.3) }}
                                >
                                    <ContextMenu>
                                        <ContextMenuTrigger
                                            render={
                                                <button
                                                    type="button"
                                                    aria-pressed={selected}
                                                    data-preset-index={i}
                                                    tabIndex={preset.id === tabStopId ? 0 : -1}
                                                    onClick={() => pick(preset)}
                                                    className={cn(
                                                        'relative flex w-20 flex-col items-center gap-1 rounded-lg p-1 text-xs outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 md:w-full',
                                                        selected
                                                            ? 'font-medium text-accent-foreground'
                                                            : 'hover:bg-accent/60',
                                                    )}
                                                />
                                            }
                                        >
                                            {selected && (
                                                // Anel por cima do conteúdo (z-20 > z-10), sem fundo: o Motion eleva este elemento no deslize e não pode tapar a miniatura.
                                                <motion.span
                                                    layoutId={`${uid}-selected`}
                                                    className="pointer-events-none absolute inset-0 z-20 rounded-lg ring-2 ring-primary"
                                                    style={{ borderRadius: 10 }}
                                                    transition={{
                                                        type: 'spring',
                                                        stiffness: 500,
                                                        damping: 38,
                                                    }}
                                                />
                                            )}
                                            {thumb ? (
                                                <img
                                                    src={thumb}
                                                    alt=""
                                                    className="relative z-10 aspect-square w-full rounded-md object-cover"
                                                />
                                            ) : (
                                                <Skeleton className="relative z-10 aspect-square w-full rounded-md" />
                                            )}
                                            <PresetName name={preset.name} />
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem
                                                onClick={() => copyText(preset.id, 'ID copiado')}
                                            >
                                                <Copy />
                                                Copiar ID
                                            </ContextMenuItem>
                                            {onDelete && !preset.id.startsWith('temp-') && (
                                                <ContextMenuItem
                                                    variant="destructive"
                                                    onClick={() => onDelete(preset)}
                                                >
                                                    <Trash2 />
                                                    Excluir
                                                </ContextMenuItem>
                                            )}
                                        </ContextMenuContent>
                                    </ContextMenu>
                                </motion.li>
                            )
                        })}
                        {hasMore && (
                            // Sentinela do scroll infinito: as miniaturas da próxima página ainda estão sendo geradas.
                            <li
                                ref={sentinelRef}
                                aria-hidden
                                className="flex shrink-0 gap-1 md:col-span-3 md:grid md:grid-cols-3"
                            >
                                {[0, 1, 2].map((n) => (
                                    <div
                                        key={n}
                                        className="flex w-20 flex-col items-center gap-1 p-1 md:w-full"
                                    >
                                        <Skeleton className="aspect-square w-full rounded-md" />
                                        <Skeleton className="h-3 w-2/3 rounded" />
                                    </div>
                                ))}
                            </li>
                        )}
                    </ul>
                </ScrollArea>
            )}
        </div>
    )
}

/** Nome com reticências; se não cabe, desliza até o fim enquanto o mouse (ou foco) está em cima. */
function PresetName({ name }: { name: string }) {
    const outer = useRef<HTMLSpanElement>(null)
    const inner = useRef<HTMLSpanElement>(null)

    const start = () => {
        const o = outer.current
        const i = inner.current
        if (!o || !i || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const diff = i.scrollWidth - o.clientWidth
        if (diff <= 0) return
        i.style.textOverflow = 'clip'
        i.style.width = 'max-content'
        // ~40px por segundo: nome comprido não passa voando
        i.style.transition = `transform ${Math.max(0.6, diff / 40)}s linear`
        i.style.transform = `translateX(-${diff}px)`
    }
    const stop = () => {
        const i = inner.current
        if (!i) return
        i.style.transition = 'transform 0.2s ease-out'
        i.style.transform = ''
        i.style.width = ''
        i.style.textOverflow = ''
    }

    // O gatilho é o card inteiro (botão), não só o texto.
    useEffect(() => {
        const host = outer.current?.closest('button')
        if (!host) return
        host.addEventListener('mouseenter', start)
        host.addEventListener('mouseleave', stop)
        host.addEventListener('focus', start)
        host.addEventListener('blur', stop)
        return () => {
            host.removeEventListener('mouseenter', start)
            host.removeEventListener('mouseleave', stop)
            host.removeEventListener('focus', start)
            host.removeEventListener('blur', stop)
        }
    })

    return (
        <span ref={outer} className="relative z-10 block w-full overflow-hidden">
            <span ref={inner} className="block w-full truncate text-center">
                {name}
            </span>
        </span>
    )
}
