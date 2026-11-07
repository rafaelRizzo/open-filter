// Testes do ThemeProvider: padrão dark, persistência, storage bloqueado e uso fora do provider.
import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from './theme'

const KEY = 'open-filter:theme'

function Probe() {
    const { theme, setTheme } = useTheme()
    return (
        <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme}
        </button>
    )
}

beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
})
afterEach(() => vi.restoreAllMocks())

describe('ThemeProvider', () => {
    it('começa em dark e aplica a classe no html', () => {
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        )
        expect(screen.getByRole('button').textContent).toBe('dark')
        expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('troca para light, persiste e remove a classe', () => {
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        )
        act(() => screen.getByRole('button').click())
        expect(screen.getByRole('button').textContent).toBe('light')
        expect(localStorage.getItem(KEY)).toBe('light')
        expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('lê o tema salvo', () => {
        localStorage.setItem(KEY, 'light')
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        )
        expect(screen.getByRole('button').textContent).toBe('light')
    })

    it('funciona com localStorage bloqueado', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('blocked')
        })
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked')
        })
        render(
            <ThemeProvider>
                <Probe />
            </ThemeProvider>,
        )
        expect(screen.getByRole('button').textContent).toBe('dark')
    })

    it('useTheme fora do provider lança erro', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/)
    })
})
