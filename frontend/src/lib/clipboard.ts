// Copia texto e avisa por toast; falha de permissão não é engolida.
import { toast } from 'sonner'

export async function copyText(text: string, okMessage: string) {
    try {
        await navigator.clipboard.writeText(text)
        toast.success(okMessage)
    } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível copiar')
    }
}
