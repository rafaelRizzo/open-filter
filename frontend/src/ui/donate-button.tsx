// Botão "Apoiar o projeto": abre as formas de doação configuradas (link e/ou Pix).
import { Check, Copy, ExternalLink, Heart } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { RainbowButton } from '@/components/ui/rainbow-button'
import { DONATE_URL, PIX_KEY, REPO_URL } from '@/lib/links'

type Props = {
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'rainbow'
    size?: 'default' | 'sm' | 'lg'
    label?: string
}

export function DonateButton({
    variant = 'outline',
    size = 'default',
    label = 'Apoiar o projeto',
}: Props) {
    const [open, setOpen] = useState(false)
    const [copied, setCopied] = useState(false)

    const copyPix = async () => {
        if (!PIX_KEY) return
        try {
            await navigator.clipboard.writeText(PIX_KEY)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            toast.error('Não foi possível copiar. Selecione a chave e copie manualmente.')
        }
    }

    return (
        <>
            {variant === 'rainbow' ? (
                <RainbowButton
                    size={size === 'lg' ? 'lg' : 'default'}
                    onClick={() => setOpen(true)}
                >
                    <Heart className="fill-red-500 text-red-500" />
                    {label}
                </RainbowButton>
            ) : (
                <Button variant={variant} size={size} onClick={() => setOpen(true)}>
                    <Heart data-icon="inline-start" className="fill-red-500 text-red-500" />
                    {label}
                </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apoiar o open-filter</DialogTitle>
                        <DialogDescription>
                            O open-filter não tem anúncios, plano pago nem rastreamento. Uma doação
                            ajuda a manter o projeto.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="flex flex-col gap-3">
                        {DONATE_URL && (
                            <Button
                                nativeButton={false}
                                render={
                                    <a
                                        href={DONATE_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    />
                                }
                            >
                                <ExternalLink data-icon="inline-start" />
                                Doar pela página do projeto
                            </Button>
                        )}
                        {PIX_KEY && (
                            <div className="flex flex-col gap-2 rounded-lg border p-3">
                                <p className="text-sm font-medium">Pix</p>
                                <code className="bg-muted rounded px-2 py-1 font-mono text-sm break-all select-all">
                                    {PIX_KEY}
                                </code>
                                <Button variant="outline" size="sm" onClick={copyPix}>
                                    {copied ? (
                                        <Check data-icon="inline-start" />
                                    ) : (
                                        <Copy data-icon="inline-start" />
                                    )}
                                    {copied ? 'Chave copiada' : 'Copiar chave'}
                                </Button>
                            </div>
                        )}
                        {!DONATE_URL && !PIX_KEY && (
                            <p className="text-muted-foreground text-sm">
                                As doações ainda não estão abertas. Enquanto isso, você ajuda
                                reportando erros e divulgando o projeto
                                {REPO_URL ? ' pelo repositório.' : '.'}
                            </p>
                        )}
                        {REPO_URL && (
                            <Button
                                variant="ghost"
                                size="sm"
                                nativeButton={false}
                                render={
                                    <a href={REPO_URL} target="_blank" rel="noopener noreferrer" />
                                }
                            >
                                Ver o código no GitHub
                            </Button>
                        )}
                    </DialogBody>
                </DialogContent>
            </Dialog>
        </>
    )
}
