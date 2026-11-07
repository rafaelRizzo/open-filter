// Testes de uniforms e grupos: nomes, escala e cobertura de todas as chaves por alguma aba.
import { describe, expect, it } from 'vitest'
import { PARAM_GROUPS, PARAM_LABELS, TABS, tabHasCurves, tabParamKeys } from './groups'
import { defaultParams, PARAM_KEYS } from './params'
import { toUniforms, UNIFORM_NAMES, uniformName } from './uniforms'

describe('uniforms', () => {
    it('nomes seguem u + CamelCase e são únicos', () => {
        expect(uniformName('exposure')).toBe('uExposure')
        expect(uniformName('hslRedHue')).toBe('uHslRedHue')
        expect(new Set(Object.values(UNIFORM_NAMES)).size).toBe(PARAM_KEYS.length)
    })

    it('toUniforms cobre todas as chaves e escala temperatura e matiz', () => {
        const u = toUniforms({ ...defaultParams(), temperature: 50, tint: -20, exposure: 0.5 })
        expect(Object.keys(u)).toHaveLength(PARAM_KEYS.length)
        expect(u.uTemperature).toBeCloseTo(0.5)
        expect(u.uTint).toBeCloseTo(-0.2)
        expect(u.uExposure).toBe(0.5)
    })
})

describe('groups', () => {
    it('toda chave de parâmetro tem rótulo e pertence a alguma aba', () => {
        const covered = new Set(TABS.flatMap((t) => tabParamKeys(t.id)))
        for (const key of PARAM_KEYS) {
            expect(PARAM_LABELS[key], key).toBeTruthy()
            expect(covered.has(key), key).toBe(true)
        }
    })

    it('nenhuma chave aparece em duas abas', () => {
        const all = TABS.flatMap((t) => tabParamKeys(t.id))
        expect(new Set(all).size).toBe(all.length)
    })

    it('curvas e corte não têm escalares; só curvas tem curvas', () => {
        expect(tabParamKeys('curves')).toEqual([])
        expect(tabParamKeys('crop')).toEqual([])
        expect(tabHasCurves('curves')).toBe(true)
        expect(tabHasCurves('light')).toBe(false)
    })

    it('efeitos inclui a intensidade do LUT e os grupos têm chaves', () => {
        expect(tabParamKeys('effects')).toContain('lutStrength')
        for (const g of PARAM_GROUPS) expect(g.keys.length).toBeGreaterThan(0)
        expect(tabParamKeys('hsl')).toContain('hslAllHue')
        expect(tabParamKeys('grading')).toContain('gradeBalance')
    })
})
