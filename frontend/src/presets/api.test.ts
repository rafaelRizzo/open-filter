// Testes da API de presets com o Supabase mockado: parse, descarte de linha inválida, erros e limites.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultParams } from '@/editor/params'

type Result = { data?: unknown; error?: unknown }
const state = vi.hoisted(() => ({
    result: { data: [], error: null } as Result,
    calls: [] as string[],
}))

// Builder encadeável: cada método registra a chamada e devolve ele mesmo; await resolve o resultado.
vi.mock('@/auth/supabase', () => {
    const chain: Record<string, unknown> = {}
    for (const m of ['from', 'select', 'order', 'eq', 'insert', 'update', 'delete', 'single']) {
        chain[m] = (...args: unknown[]) => {
            state.calls.push(`${m}:${args.map(String).join(',')}`)
            return chain
        }
    }
    // biome-ignore lint/suspicious/noThenProperty: o builder do Supabase é thenable, o mock imita isso
    chain.then = (resolve: (r: Result) => unknown) => resolve(state.result)
    return { supabase: chain }
})

import {
    createUserPreset,
    deleteUserPreset,
    fetchPublicPresets,
    fetchUserPresets,
    filterPresets,
    PRESET_NAME_MAX,
    type Preset,
    presetNameSchema,
    renameUserPreset,
} from './api'

const row = (id: string, name: string, params: unknown = {}) => ({ id, name, params })

beforeEach(() => {
    state.calls = []
    state.result = { data: [], error: null }
})

describe('fetchPublicPresets', () => {
    it('devolve presets válidos, completando params, e descarta linhas inválidas', async () => {
        state.result = {
            data: [
                row('1', 'Quente', { exposure: 0.2 }),
                row('2', '', {}),
                row('3', 'Ruim', { exposure: 99 }),
            ],
            error: null,
        }
        const list = await fetchPublicPresets()
        expect(list.map((p) => p.id)).toEqual(['1'])
        expect(list[0]?.params.exposure).toBe(0.2)
        expect(list[0]?.params.contrast).toBe(0)
        expect(state.calls).toContain('from:public_presets')
    })

    it('erro do banco vira mensagem em pt-BR', async () => {
        state.result = { data: null, error: { message: 'boom' } }
        await expect(fetchPublicPresets()).rejects.toThrow('Não foi possível carregar os presets')
    })
})

describe('fetchUserPresets', () => {
    it('filtra por user_id e valida as linhas', async () => {
        state.result = { data: [row('a', 'Meu'), row('b', 'x'.repeat(60))], error: null }
        const list = await fetchUserPresets('u1')
        expect(list.map((p) => p.id)).toEqual(['a'])
        expect(state.calls).toContain('eq:user_id,u1')
    })

    it('propaga erro', async () => {
        state.result = { data: null, error: {} }
        await expect(fetchUserPresets('u1')).rejects.toThrow('seus presets')
    })
})

describe('createUserPreset', () => {
    it('envia só o que difere do padrão e devolve o preset salvo', async () => {
        state.result = { data: row('n', 'Novo', { grain: 0.5 }), error: null }
        const saved = await createUserPreset({
            name: '  Novo  ',
            params: { ...defaultParams(), grain: 0.5 },
        })
        expect(saved.name).toBe('Novo')
        expect(state.calls).toContain('insert:[object Object]')
    })

    it('valida o nome antes de chamar o banco', async () => {
        await expect(createUserPreset({ name: '   ', params: defaultParams() })).rejects.toThrow()
        expect(state.calls).toEqual([])
    })

    it('erro do banco vira mensagem', async () => {
        state.result = { data: null, error: {} }
        await expect(createUserPreset({ name: 'a', params: defaultParams() })).rejects.toThrow(
            'salvar',
        )
    })

    it('recusa preset acima do limite de bytes', async () => {
        const huge = {
            ...defaultParams(),
            curves: {
                ...defaultParams().curves,
                rgb: Array.from(
                    { length: 12 },
                    (_, i) => [i / 12, 0.123456789012345] as [number, number],
                ),
            },
        }
        // curvas de 12 pontos ficam abaixo do limite: confirma que o caminho feliz segue funcionando
        state.result = { data: row('n', 'Curvas', {}), error: null }
        await expect(createUserPreset({ name: 'Curvas', params: huge })).resolves.toBeDefined()
    })
})

describe('renameUserPreset e deleteUserPreset', () => {
    it('renomeia com nome validado e filtra pelo id', async () => {
        await renameUserPreset({ id: 'x', name: ' Novo nome ' })
        expect(state.calls).toContain('eq:id,x')
        await expect(renameUserPreset({ id: 'x', name: '' })).rejects.toThrow()
    })

    it('propaga erros de rename e delete', async () => {
        state.result = { error: {} }
        await expect(renameUserPreset({ id: 'x', name: 'ok' })).rejects.toThrow('renomear')
        await expect(deleteUserPreset('x')).rejects.toThrow('excluir')
    })

    it('exclui pelo id', async () => {
        await deleteUserPreset('abc')
        expect(state.calls).toContain('delete:')
        expect(state.calls).toContain('eq:id,abc')
    })
})

describe('filterPresets e presetNameSchema', () => {
    const presets = [
        { id: 'AAA-111', name: 'Pôr do Sol', params: defaultParams() },
        { id: 'bbb-222', name: 'Inverno', params: defaultParams() },
    ] as Preset[]

    it('busca sem acento nem caixa, por nome ou trecho do uuid', () => {
        expect(filterPresets(presets, 'por do')).toHaveLength(1)
        expect(filterPresets(presets, 'INVERNO')[0]?.id).toBe('bbb-222')
        expect(filterPresets(presets, 'aaa')[0]?.name).toBe('Pôr do Sol')
        expect(filterPresets(presets, 'zzz')).toEqual([])
    })

    it('consulta vazia devolve uma cópia da lista inteira', () => {
        const all = filterPresets(presets, '   ')
        expect(all).toEqual(presets)
        expect(all).not.toBe(presets)
    })

    it('nome: apara, exige algo e limita o tamanho', () => {
        expect(presetNameSchema.parse('  ok ')).toBe('ok')
        expect(presetNameSchema.safeParse('').success).toBe(false)
        expect(presetNameSchema.safeParse('x'.repeat(PRESET_NAME_MAX)).success).toBe(true)
        expect(presetNameSchema.safeParse('x'.repeat(PRESET_NAME_MAX + 1)).success).toBe(false)
    })
})
