// Confirmação de exclusão de preset pessoal (usada em /presets e no menu de contexto do editor).
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import type { Preset } from '@/presets/api'
import { useDeletePreset } from '@/presets/queries'

export function DeletePresetDialog({
    userId,
    preset,
    onClose,
}: {
    userId: string
    preset: Preset | null
    onClose: () => void
}) {
    const del = useDeletePreset(userId)
    return (
        <Dialog open={!!preset} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Excluir preset?</DialogTitle>
                    <DialogDescription>
                        "{preset?.name}" será removido da sua conta. Esta ação não pode ser
                        desfeita.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (!preset) return
                            del.mutate(preset.id, {
                                onError: (err) =>
                                    toast.error(
                                        err instanceof Error
                                            ? err.message
                                            : 'Não foi possível excluir',
                                    ),
                                onSuccess: () => toast.success('Preset excluído'),
                            })
                            onClose()
                        }}
                    >
                        Excluir
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
