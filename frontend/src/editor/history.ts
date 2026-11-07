// Histórico de desfazer/refazer: pilha de snapshots dos params (objetos pequenos, copiar é barato).
import { type EditParams, paramsEqual } from './params'

const MAX_ENTRIES = 100

export type History = {
    /** Registra o estado atual como novo ponto. Descarta o "refazer". Devolve false se nada mudou. */
    record: (params: EditParams) => boolean
    undo: () => EditParams | null
    redo: () => EditParams | null
    canUndo: () => boolean
    canRedo: () => boolean
}

export const createHistory = (initial: EditParams): History => {
    let stack: EditParams[] = [{ ...initial }]
    let index = 0

    return {
        record(params) {
            const current = stack[index]
            if (current && paramsEqual(current, params)) return false
            stack = stack.slice(0, index + 1)
            stack.push({ ...params })
            if (stack.length > MAX_ENTRIES) stack.shift()
            index = stack.length - 1
            return true
        },
        undo() {
            if (index === 0) return null
            index -= 1
            return { ...(stack[index] as EditParams) }
        },
        redo() {
            if (index >= stack.length - 1) return null
            index += 1
            return { ...(stack[index] as EditParams) }
        },
        canUndo: () => index > 0,
        canRedo: () => index < stack.length - 1,
    }
}
