// Gera a miniatura (JPEG pequeno) usada na galeria; a original nunca é redimensionada aqui.

const THUMB_SIDE = 320

export const makeThumbnail = async (bitmap: ImageBitmap): Promise<Blob> => {
    const scale = Math.min(1, THUMB_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = new OffscreenCanvas(
        Math.max(1, Math.round(bitmap.width * scale)),
        Math.max(1, Math.round(bitmap.height * scale)),
    )
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 })
}
