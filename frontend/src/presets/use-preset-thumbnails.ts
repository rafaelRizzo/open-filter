// Hook: decodifica a miniatura da foto e renderiza cada preset aplicado, sem bloquear a UI.
import { useEffect, useState } from 'react'
import { renderPresetThumbnails } from '@/editor/preset-thumbnails'
import type { Preset } from './api'

export const usePresetThumbnails = (
    thumbnail: Blob | undefined,
    presets: readonly Preset[] | undefined,
) => {
    const [thumbs, setThumbs] = useState<Map<string, string>>(new Map())

    useEffect(() => {
        if (!thumbnail || !presets || presets.length === 0) return
        let cancelled = false
        let bitmap: ImageBitmap | null = null

        const run = async () => {
            bitmap = await createImageBitmap(thumbnail, { imageOrientation: 'from-image' })
            const map = await renderPresetThumbnails(
                bitmap,
                presets.map((p) => ({ id: p.id, params: p.params })),
                () => cancelled,
            )
            if (!cancelled) setThumbs(map)
        }
        // Falha de miniatura não é crítica: a faixa cai para o nome do preset sem imagem.
        run().catch(() => undefined)

        return () => {
            cancelled = true
            bitmap?.close()
        }
    }, [thumbnail, presets])

    return thumbs
}
