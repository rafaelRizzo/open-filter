// Botão que abre o seletor de arquivo, importa a foto para o IndexedDB e abre o editor.
import { ImagePlus } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/storage'
import { formatMegapixels, MAX_FILE_BYTES, MAX_IMPORT_PIXELS } from '@/photos/limits'
import { useImportFiles } from './use-import-files'

export function ImportButton() {
    const inputRef = useRef<HTMLInputElement>(null)
    const { importFiles, isPending } = useImportFiles()

    return (
        <>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp"
                multiple
                className="hidden"
                onChange={(e) => {
                    void importFiles([...(e.target.files ?? [])])
                    e.target.value = ''
                }}
            />
            <div className="flex flex-col items-start gap-1.5">
                <Button size="lg" onClick={() => inputRef.current?.click()} disabled={isPending}>
                    <ImagePlus data-icon="inline-start" />
                    Importar foto
                </Button>
                <p className="text-muted-foreground text-xs">
                    JPEG, PNG, WebP, AVIF, GIF ou BMP, até {formatBytes(MAX_FILE_BYTES)} e{' '}
                    {formatMegapixels(MAX_IMPORT_PIXELS)}.
                </p>
            </div>
        </>
    )
}
