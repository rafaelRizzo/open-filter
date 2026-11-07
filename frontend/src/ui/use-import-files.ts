// Importa fotos para o IndexedDB e abre o editor (uma foto) ou avisa quantas entraram (várias).
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
    formatBytes,
    freeBytes,
    isQuotaError,
    readStorage,
    requestPersistence,
} from '@/lib/storage'
import { useImportPhoto } from '@/photos/queries'
import { validateImageFile } from '@/photos/validate'

export function useImportFiles() {
    const navigate = useNavigate()
    const importPhoto = useImportPhoto()

    const importFiles = async (files: readonly File[]) => {
        // Pedido dentro do gesto do usuário (clique ou soltar): é quando o navegador mais aceita proteger os dados.
        void requestPersistence().catch(() => false)
        // Confere o conteúdo de cada arquivo (não só a extensão) e os limites de tamanho e de pixels.
        const images: File[] = []
        const rejected: string[] = []
        for (const file of files) {
            try {
                await validateImageFile(file, file.name)
                images.push(file)
            } catch (e) {
                rejected.push(e instanceof Error ? e.message : `${file.name}: arquivo inválido`)
            }
        }
        if (rejected.length > 0)
            toast.error(
                rejected.length === 1
                    ? (rejected[0] ?? 'Arquivo recusado')
                    : `${rejected.length} arquivos recusados. ${rejected[0]}`,
                { duration: 8000 },
            )
        if (images.length === 0) return
        // Original + miniatura + decodificação temporária: pede uma folga sobre o tamanho dos arquivos.
        const needed = images.reduce((sum, f) => sum + f.size, 0) * 1.5
        const storage = await readStorage().catch(() => null)
        if (storage?.supported && storage.quota > 0 && freeBytes(storage) < needed) {
            toast.error(
                `Sem espaço no navegador: precisa de cerca de ${formatBytes(needed)} e restam ${formatBytes(freeBytes(storage))}. Exclua fotos do álbum ou faça um backup no perfil.`,
                { duration: 10000 },
            )
            return
        }
        const id = toast.loading(images.length > 1 ? 'Importando fotos...' : 'Importando foto...')
        try {
            // Em sequência: decodificar várias fotos grandes ao mesmo tempo estoura a memória.
            const saved = []
            for (const file of images) saved.push(await importPhoto.mutateAsync(file))
            const [first] = saved
            if (saved.length === 1 && first) {
                toast.success('Foto importada', { id })
                await navigate({ to: '/editor/$photoId', params: { photoId: first.id } })
            } else {
                toast.success(`${saved.length} fotos importadas`, { id })
            }
        } catch (e) {
            // A estimativa do navegador é aproximada: o erro real de cota ainda pode vir na gravação.
            toast.error(
                isQuotaError(e)
                    ? 'O navegador ficou sem espaço para guardar a foto. Exclua fotos ou faça um backup no perfil.'
                    : 'Não foi possível ler esta imagem',
                { id },
            )
        }
    }

    return { importFiles, isPending: importPhoto.isPending }
}
