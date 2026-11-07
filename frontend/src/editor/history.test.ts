// Testes do histórico: gravar, desfazer, refazer, descarte do refazer e limite de entradas.
import { describe, expect, it } from 'vitest'
import { createHistory } from './history'
import { defaultParams } from './params'

const at = (exposure: number) => ({ ...defaultParams(), exposure })

describe('createHistory', () => {
    it('começa sem desfazer nem refazer', () => {
        const h = createHistory(defaultParams())
        expect(h.canUndo()).toBe(false)
        expect(h.canRedo()).toBe(false)
        expect(h.undo()).toBeNull()
        expect(h.redo()).toBeNull()
    })

    it('ignora gravação sem mudança e grava quando muda', () => {
        const h = createHistory(defaultParams())
        expect(h.record(defaultParams())).toBe(false)
        expect(h.record(at(0.5))).toBe(true)
        expect(h.record(at(0.5))).toBe(false)
        expect(h.canUndo()).toBe(true)
    })

    it('desfaz e refaz na ordem, devolvendo cópias', () => {
        const h = createHistory(defaultParams())
        h.record(at(0.2))
        h.record(at(0.4))
        const u1 = h.undo()
        expect(u1?.exposure).toBe(0.2)
        expect(h.undo()?.exposure).toBe(0)
        expect(h.canUndo()).toBe(false)
        expect(h.canRedo()).toBe(true)
        expect(h.redo()?.exposure).toBe(0.2)
        expect(h.redo()?.exposure).toBe(0.4)
        expect(h.redo()).toBeNull()
        if (u1) u1.exposure = 9
        expect(h.undo()?.exposure).toBe(0.2)
    })

    it('gravar depois de desfazer descarta o refazer', () => {
        const h = createHistory(defaultParams())
        h.record(at(0.2))
        h.record(at(0.4))
        h.undo()
        h.record(at(0.9))
        expect(h.canRedo()).toBe(false)
        expect(h.undo()?.exposure).toBe(0.2)
    })

    it('guarda no máximo 100 estados', () => {
        const h = createHistory(defaultParams())
        for (let i = 1; i <= 150; i++) h.record(at(i / 1000))
        let steps = 0
        while (h.undo()) steps++
        expect(steps).toBe(99)
    })
})
