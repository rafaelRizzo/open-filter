// Lista de atalhos de teclado (tecla `?`).
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

const SHORTCUTS: [string, string][] = [
    ['\\', 'Divisor antes/depois'],
    ['C (segurar)', 'Comparar com a original'],
    ['F', 'Tela cheia'],
    ['J', 'Aviso de estouro de realces e sombras'],
    ['G', 'Grade de composição (terços, centro, áurea, diagonais)'],
    ['H', 'Linha do horizonte arrastável'],
    ['O  /  Shift + O', 'Girar 180° / espelhar a espiral áurea'],
    ['+  /  -  /  0', 'Zoom: aproximar, afastar, ajustar à tela'],
    ['Roda do mouse', 'Zoom no ponto do cursor'],
    ['Arrastar', 'Mover a imagem (com zoom)'],
    ['Duplo clique na foto', 'Alternar zoom (só em cima da foto)'],
    ['Ctrl/Cmd + Z', 'Desfazer'],
    ['Ctrl/Cmd + Shift + Z', 'Refazer'],
    ['R', 'Redefinir todos os ajustes'],
    ['1 a 8', 'Abas Luz, Cor, HSL, Grading, Curvas, Efeitos, Detalhe, Cortar'],
    ['Setas na lista de presets', 'Trocar de preset (Home/End: primeiro/último)'],
    ['Setas no slider', 'Ajuste fino (Shift = 10x)'],
    ['Duplo clique no rótulo', 'Redefinir só aquele ajuste'],
    ['Ctrl/Cmd + E', 'Exportar'],
    ['?', 'Esta lista'],
]

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export function ShortcutsDialog({ open, onOpenChange }: Props) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Atalhos de teclado</DialogTitle>
                    <DialogDescription>
                        Valem na tela do editor, fora dos campos de texto.
                    </DialogDescription>
                </DialogHeader>
                <DialogBody>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        {SHORTCUTS.map(([keys, label]) => (
                            <div key={keys} className="contents">
                                <dt>
                                    <kbd className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-xs">
                                        {keys}
                                    </kbd>
                                </dt>
                                <dd className="text-muted-foreground">{label}</dd>
                            </div>
                        ))}
                    </dl>
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}
