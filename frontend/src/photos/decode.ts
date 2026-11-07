// Decodifica Blob em ImageBitmap respeitando EXIF e gera a versão reduzida para o preview.

export const PREVIEW_MAX_SIDE = 2048

export type DecodedPhoto = {
    /** Versão para o canvas (máx. PREVIEW_MAX_SIDE no maior lado). */
    preview: ImageBitmap
    /** Dimensões reais já com a orientação EXIF aplicada. */
    width: number
    height: number
}

export const decodePhoto = async (blob: Blob): Promise<DecodedPhoto> => {
    // imageOrientation 'from-image' aplica o EXIF na decodificação (sem rotacionar na mão).
    const full = await createImageBitmap(blob, { imageOrientation: 'from-image' })
    const { width, height } = full
    const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(width, height))
    if (scale === 1) return { preview: full, width, height }

    // Reduz já no decode para não manter o bitmap gigante vivo na GPU/memória.
    const preview = await createImageBitmap(full, {
        resizeWidth: Math.round(width * scale),
        resizeHeight: Math.round(height * scale),
        resizeQuality: 'high',
    })
    full.close()
    return { preview, width, height }
}
