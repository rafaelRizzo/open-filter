// Hooks do TanStack Query para presets. Keys: ['presets','public'] e ['presets','user', userId].
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { compactParams, type EditParams, paramsSchema } from '@/editor/params'
import {
    createUserPreset,
    deleteUserPreset,
    fetchPublicPresets,
    fetchUserPresets,
    type Preset,
    renameUserPreset,
    updateUserPreset,
} from './api'

export const publicPresetsQuery = () =>
    queryOptions({
        queryKey: ['presets', 'public'],
        queryFn: fetchPublicPresets,
        // Presets oficiais mudam raramente: 10 min sem refetch.
        staleTime: 10 * 60_000,
    })

export const usePublicPresets = () => useQuery(publicPresetsQuery())

export const userPresetsQuery = (userId: string) =>
    queryOptions({ queryKey: ['presets', 'user', userId], queryFn: () => fetchUserPresets(userId) })

/** Sem login (userId undefined) a query fica desligada: visitante só vê os oficiais. */
export const useUserPresets = (userId: string | undefined) =>
    useQuery({
        ...userPresetsQuery(userId ?? 'anon'),
        enabled: !!userId,
    })

/**
 * Mutations com atualização otimista: a lista muda na hora, volta ao estado anterior se o servidor
 * recusar, e sempre revalida no fim (onSettled) para pegar o id real e o que mudou em outro aparelho.
 */
const useOptimistic = <TVars>(userId: string, apply: (list: Preset[], vars: TVars) => Preset[]) => {
    const qc = useQueryClient()
    const key = ['presets', 'user', userId] as const
    return {
        onMutate: async (vars: TVars) => {
            await qc.cancelQueries({ queryKey: key })
            const previous = qc.getQueryData<Preset[]>(key)
            qc.setQueryData<Preset[]>(key, (old) => apply(old ?? [], vars))
            return { previous }
        },
        onError: (
            _err: unknown,
            _vars: TVars,
            ctx: { previous: Preset[] | undefined } | undefined,
        ) => {
            if (ctx?.previous) qc.setQueryData(key, ctx.previous)
        },
        onSettled: () => qc.invalidateQueries({ queryKey: key }),
    }
}

export const useCreatePreset = (userId: string) =>
    useMutation({
        mutationFn: createUserPreset,
        ...useOptimistic<{ name: string; params: EditParams }>(userId, (list, v) => [
            { id: `temp-${crypto.randomUUID()}`, name: v.name.trim(), params: v.params },
            ...list,
        ]),
    })

export const useUpdatePreset = (userId: string) =>
    useMutation({
        mutationFn: updateUserPreset,
        ...useOptimistic<{ id: string; params: EditParams }>(userId, (list, v) =>
            // Mesmo formato que volta do banco (sem geometria).
            list.map((p) =>
                p.id === v.id ? { ...p, params: paramsSchema.parse(compactParams(v.params)) } : p,
            ),
        ),
    })

export const useRenamePreset = (userId: string) =>
    useMutation({
        mutationFn: renameUserPreset,
        ...useOptimistic<{ id: string; name: string }>(userId, (list, v) =>
            list.map((p) => (p.id === v.id ? { ...p, name: v.name.trim() } : p)),
        ),
    })

export const useDeletePreset = (userId: string) =>
    useMutation({
        mutationFn: deleteUserPreset,
        ...useOptimistic<string>(userId, (list, id) => list.filter((p) => p.id !== id)),
    })
