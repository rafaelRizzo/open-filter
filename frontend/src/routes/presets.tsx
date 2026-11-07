// Meus presets: lista, renomeia e exclui. Exige login (guard no beforeLoad via contexto do router).
import { createFileRoute, redirect } from '@tanstack/react-router'
import { MyPresetsPage } from '@/ui/my-presets-page'

export const Route = createFileRoute('/presets')({
    beforeLoad: async ({ context }) => {
        const session = await context.auth.getSession()
        if (!session) throw redirect({ to: '/app', search: { entrar: true } })
    },
    component: MyPresetsPage,
})
