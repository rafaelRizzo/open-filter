// Testes do cn(): junção de classes e resolução de conflito do Tailwind.
import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
    it('junta classes e ignora falsy', () => {
        expect(cn('a', false && 'b', undefined, 'c')).toBe('a c')
    })

    it('a última classe conflitante vence', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4')
    })
})
