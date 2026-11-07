// Planejamento puro da exportação em tiles: limites do canvas e recortes com halo para o unsharp.
import { exportPixelLimit, formatMegapixels } from '@/photos/limits'

/** Halo em px em volta de cada tile: o unsharp lê vizinhos e não pode ver a borda do recorte. */
export const TILE_HALO = 2
/** Teto de lado do tile, mesmo se a GPU aceitar mais (memória e estabilidade). */
export const TILE_MAX_SIDE = 4096
/** Limites seguros de canvas 2D entre navegadores (Safari é o mais restrito). */
export const MAX_CANVAS_SIDE = 16384
export const MAX_CANVAS_AREA = 268_435_456

export type Tile = {
    /** Região final dentro da imagem completa. */
    x: number
    y: number
    w: number
    h: number
    /** Recorte lido da imagem (região + halo, limitado às bordas). */
    cx: number
    cy: number
    cw: number
    ch: number
}

export const assertExportable = (width: number, height: number) => {
    if (width > MAX_CANVAS_SIDE || height > MAX_CANVAS_SIDE || width * height > MAX_CANVAS_AREA) {
        throw new Error('Imagem grande demais para exportar neste navegador')
    }
    // Teto por memória do aparelho (menor que o do canvas): evita a aba cair no meio da exportação.
    const limit = exportPixelLimit()
    if (width * height > limit) {
        throw new Error(
            `A imagem final tem ${formatMegapixels(width * height)} e este aparelho exporta até ${formatMegapixels(limit)}. Reduza o tamanho na aba Cortar.`,
        )
    }
}

/** maxTextureSize é o MAX_TEXTURE_SIZE da GPU; o recorte (região + halo) nunca passa dele. */
export const planTiles = (width: number, height: number, maxTextureSize: number): Tile[] => {
    const side = Math.min(maxTextureSize, TILE_MAX_SIDE) - TILE_HALO * 2
    if (side < 1) throw new Error('Textura máxima da GPU pequena demais')

    const tiles: Tile[] = []
    for (let y = 0; y < height; y += side) {
        for (let x = 0; x < width; x += side) {
            const w = Math.min(side, width - x)
            const h = Math.min(side, height - y)
            const cx = Math.max(0, x - TILE_HALO)
            const cy = Math.max(0, y - TILE_HALO)
            const cw = Math.min(width, x + w + TILE_HALO) - cx
            const ch = Math.min(height, y + h + TILE_HALO) - cy
            tiles.push({ x, y, w, h, cx, cy, cw, ch })
        }
    }
    return tiles
}
