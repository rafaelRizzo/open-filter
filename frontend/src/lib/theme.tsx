// ThemeProvider próprio (classe .dark no <html>, padrão dark, persistido em localStorage).
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void }

const STORAGE_KEY = 'open-filter:theme'
const ThemeContext = createContext<ThemeContextValue | null>(null)

const readStoredTheme = (): Theme => {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
    } catch {
        return 'dark'
    }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(readStoredTheme)

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
        // color-scheme dos controles nativos (barra de rolagem, campos) acompanha o tema.
        document.documentElement.style.colorScheme = theme
        try {
            localStorage.setItem(STORAGE_KEY, theme)
        } catch {
            // storage bloqueado (modo privado): o tema só não persiste
        }
    }, [theme])

    return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error('useTheme precisa estar dentro de ThemeProvider')
    return ctx
}
