// Acesso ao Supabase para presets. Toda linha passa pelo schema zod antes de chegar na UI.
import { z } from 'zod'
import { supabase } from '@/auth/supabase'
import { compactParams, type EditParams, paramsSchema } from '@/editor/params'

export const presetSchema = z.object({
    id: z.string(),
    name: z.string().min(1).max(50),
    params: paramsSchema,
    /** Só os presets oficiais têm categoria (coluna `category` de public_presets). */
    category: z.string().optional(),
})

export type Preset = z.infer<typeof presetSchema>

export const fetchPublicPresets = async (): Promise<Preset[]> => {
    const { data, error } = await supabase
        .from('public_presets')
        .select('id, name, params, category')
        .order('sort_order', { ascending: true })
    if (error) throw new Error('Não foi possível carregar os presets')
    // Uma linha inválida não derruba a lista toda: é descartada.
    return data.flatMap((row) => {
        const parsed = presetSchema.safeParse(row)
        return parsed.success ? [parsed.data] : []
    })
}

const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

/** Filtra por nome (sem acento, sem caixa) ou por trecho do UUID. */
export const filterPresets = (presets: readonly Preset[], query: string): Preset[] => {
    const q = normalize(query.trim())
    if (!q) return [...presets]
    return presets.filter((p) => normalize(p.name).includes(q) || p.id.toLowerCase().includes(q))
}

export const PRESET_NAME_MAX = 50
/** Limite do CHECK do banco (pg_column_size(params) <= 2048). Medimos o JSON para avisar antes de enviar. */
export const PRESET_PARAMS_MAX_BYTES = 2000
/** Espelha o trigger `enforce_user_presets_limit` (migration 20261107170000). */
export const USER_PRESETS_LIMIT = 10000

export const presetNameSchema = z
    .string()
    .trim()
    .min(1, 'Dê um nome ao preset')
    .max(PRESET_NAME_MAX, `Até ${PRESET_NAME_MAX} caracteres`)

const parseRows = (rows: unknown[]): Preset[] =>
    rows.flatMap((row) => {
        const parsed = presetSchema.safeParse(row)
        return parsed.success ? [parsed.data] : []
    })

// RLS garante que só voltam as linhas do usuário logado; o filtro por user_id é só explícito.
export const fetchUserPresets = async (userId: string): Promise<Preset[]> => {
    const { data, error } = await supabase
        .from('user_presets')
        .select('id, name, params')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    if (error) throw new Error('Não foi possível carregar seus presets')
    return parseRows(data)
}

/** Só o que difere do padrão: preset enxuto cabe com folga no limite de 2 KB do banco. */
const packParams = (params: EditParams) => {
    const packed = compactParams(params)
    if (JSON.stringify(packed).length > PRESET_PARAMS_MAX_BYTES)
        throw new Error('Preset grande demais para salvar')
    return packed
}

export const createUserPreset = async (input: {
    name: string
    params: EditParams
}): Promise<Preset> => {
    const name = presetNameSchema.parse(input.name)
    const params = packParams(input.params)
    const { data, error } = await supabase
        .from('user_presets')
        .insert({ name, params })
        .select('id, name, params')
        .single()
    if (error) {
        if (error.message.includes('preset_limit_reached'))
            throw new Error(
                `Você chegou ao limite de ${USER_PRESETS_LIMIT} filtros. Exclua algum para criar outro.`,
            )
        throw new Error('Não foi possível salvar o preset')
    }
    return presetSchema.parse(data)
}

export const updateUserPreset = async (input: {
    id: string
    params: EditParams
}): Promise<Preset> => {
    const { data, error } = await supabase
        .from('user_presets')
        .update({ params: packParams(input.params) })
        .eq('id', input.id)
        .select('id, name, params')
        .single()
    if (error) throw new Error('Não foi possível atualizar o preset')
    return presetSchema.parse(data)
}

export const renameUserPreset = async (input: { id: string; name: string }): Promise<void> => {
    const { error } = await supabase
        .from('user_presets')
        .update({ name: presetNameSchema.parse(input.name) })
        .eq('id', input.id)
    if (error) throw new Error('Não foi possível renomear o preset')
}

export const deleteUserPreset = async (id: string): Promise<void> => {
    const { error } = await supabase.from('user_presets').delete().eq('id', id)
    if (error) throw new Error('Não foi possível excluir o preset')
}
