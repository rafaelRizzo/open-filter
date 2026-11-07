// Área que aceita fotos arrastadas do computador: mostra um aviso por cima enquanto o arquivo está sobre ela.
import { ImagePlus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type DragEvent, type ReactNode, useRef, useState } from 'react'
import { useImportFiles } from './use-import-files'

const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes('Files')

export function PhotoDropZone({
    className,
    children,
}: {
    className?: string
    children: ReactNode
}) {
    const { importFiles } = useImportFiles()
    const [over, setOver] = useState(false)
    // dragenter/dragleave disparam também nos filhos: o contador evita o aviso piscar.
    const depth = useRef(0)

    return (
        <div
            className={className}
            onDragEnter={(e) => {
                if (!hasFiles(e)) return
                depth.current += 1
                setOver(true)
            }}
            onDragOver={(e) => {
                // Sem preventDefault o navegador não aceita o drop (e abriria o arquivo na aba).
                if (hasFiles(e)) e.preventDefault()
            }}
            onDragLeave={(e) => {
                if (!hasFiles(e)) return
                depth.current = Math.max(0, depth.current - 1)
                if (depth.current === 0) setOver(false)
            }}
            onDrop={(e) => {
                if (!hasFiles(e)) return
                e.preventDefault()
                depth.current = 0
                setOver(false)
                void importFiles([...e.dataTransfer.files])
            }}
        >
            {children}
            <AnimatePresence>
                {over && (
                    <motion.div
                        role="status"
                        className="bg-background/70 border-primary/50 bg-linear-to-b from-primary/10 to-transparent pointer-events-none fixed inset-x-3 top-14 bottom-3 z-40 flex items-center justify-center rounded-3xl border-2 border-dashed backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                    >
                        <motion.div
                            className="bg-card flex max-w-sm flex-col items-center gap-4 rounded-2xl border px-10 py-8 text-center shadow-2xl"
                            initial={{ scale: 0.94, y: 8 }}
                            animate={{ scale: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        >
                            <motion.div
                                className="bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-2xl"
                                animate={{ y: [0, -6, 0] }}
                                transition={{
                                    duration: 1.4,
                                    repeat: Number.POSITIVE_INFINITY,
                                    ease: 'easeInOut',
                                }}
                            >
                                <ImagePlus className="size-8" />
                            </motion.div>
                            <div className="flex flex-col gap-1">
                                <p className="font-heading text-2xl font-semibold">
                                    Solte para importar
                                </p>
                                <p className="text-muted-foreground text-sm text-pretty">
                                    Pode soltar várias fotos de uma vez. Elas ficam só neste
                                    navegador.
                                </p>
                            </div>
                            <p className="text-muted-foreground bg-muted rounded-full px-3 py-1 text-xs">
                                JPEG, PNG, WebP e outros
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
