// Alterna entre tema claro e escuro com a transição animada do Magic UI. O tema continua sendo do ThemeProvider.
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler'
import { buttonVariants } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'
import { Hint } from '@/ui/hint'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const label = theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'
    // wrap: o toggler aplica {...props} depois do onClick, e o tooltip sobrescreveria a troca de tema.
    return (
        <Hint label={label} wrap>
            <AnimatedThemeToggler
                theme={theme}
                onThemeChange={setTheme}
                aria-label={label}
                className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })}
            />
        </Hint>
    )
}
