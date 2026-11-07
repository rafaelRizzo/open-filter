// Geometria da foto: corte, girar de 90 em 90, espelhar, endireitar e tamanho final. Tudo puro e testável.
// O "quadro" é a foto depois de girar/espelhar (sem o corte): o corte vive em coordenadas 0..1 do quadro.
import { z } from 'zod'

export type Crop = { x: number; y: number; w: number; h: number }

export const MIN_CROP = 0.02
export const STRAIGHTEN_LIMIT = 30

const fullCrop = (): Crop => ({ x: 0, y: 0, w: 1, h: 1 })

const cropSchema = z
    .object({
        x: z.number().min(0).max(1).default(0),
        y: z.number().min(0).max(1).default(0),
        w: z.number().min(MIN_CROP).max(1).default(1),
        h: z.number().min(MIN_CROP).max(1).default(1),
    })
    // Corte nunca passa da borda do quadro.
    .refine((c) => c.x + c.w <= 1 + 1e-6 && c.y + c.h <= 1 + 1e-6)

export const geometrySchema = z
    .object({
        crop: cropSchema.default(fullCrop),
        /** Quartos de volta no sentido horário (0 a 3). */
        rotate: z.number().int().min(0).max(3).default(0),
        flipX: z.boolean().default(false),
        flipY: z.boolean().default(false),
        /** Inclinação fina em graus; a foto é ampliada o mínimo para não sobrar canto vazio. */
        straighten: z.number().min(-STRAIGHTEN_LIMIT).max(STRAIGHTEN_LIMIT).default(0),
        /** Largura final em px (altura acompanha). null = tamanho do corte, sem redimensionar. */
        exportWidth: z.number().int().min(16).max(16384).nullable().default(null),
    })
    .default(() => ({
        crop: fullCrop(),
        rotate: 0,
        flipX: false,
        flipY: false,
        straighten: 0,
        exportWidth: null,
    }))

export type Geometry = z.infer<typeof geometrySchema>

export const defaultGeometry = (): Geometry => geometrySchema.parse(undefined)

export const cropIsFull = (c: Crop) => c.x === 0 && c.y === 0 && c.w === 1 && c.h === 1

export const isIdentityGeometry = (g: Geometry) =>
    cropIsFull(g.crop) &&
    g.rotate === 0 &&
    !g.flipX &&
    !g.flipY &&
    g.straighten === 0 &&
    g.exportWidth === null

export const geometryEqual = (a: Geometry, b: Geometry) =>
    a.crop.x === b.crop.x &&
    a.crop.y === b.crop.y &&
    a.crop.w === b.crop.w &&
    a.crop.h === b.crop.h &&
    a.rotate === b.rotate &&
    a.flipX === b.flipX &&
    a.flipY === b.flipY &&
    a.straighten === b.straighten &&
    a.exportWidth === b.exportWidth

/** Medidas do quadro (foto já girada em quartos de volta), em px da original. */
export const frameSize = (srcW: number, srcH: number, g: Pick<Geometry, 'rotate'>) =>
    g.rotate % 2 === 1 ? { w: srcH, h: srcW } : { w: srcW, h: srcH }

/**
 * Ampliação mínima para que a foto girada em `deg` ainda cubra o quadro inteiro.
 * Para um retângulo fw x fh, o fator exato é cos(a) + sen(a) * max(fw/fh, fh/fw).
 */
export const straightenScale = (frameW: number, frameH: number, deg: number) => {
    const a = (Math.abs(deg) * Math.PI) / 180
    if (a === 0) return 1
    return Math.cos(a) + Math.sin(a) * Math.max(frameW / frameH, frameH / frameW)
}

/** Tamanho do corte em px da original (antes de redimensionar). */
export const cropPixels = (srcW: number, srcH: number, g: Geometry) => {
    const f = frameSize(srcW, srcH, g)
    return {
        w: Math.max(1, Math.round(g.crop.w * f.w)),
        h: Math.max(1, Math.round(g.crop.h * f.h)),
    }
}

/** Tamanho final da exportação: o corte, ou redimensionado para `exportWidth` mantendo a proporção. */
export const outputSize = (srcW: number, srcH: number, g: Geometry) => {
    const c = cropPixels(srcW, srcH, g)
    if (g.exportWidth === null) return c
    return { w: g.exportWidth, h: Math.max(1, Math.round((g.exportWidth * c.h) / c.w)) }
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Mantém o corte dentro do quadro e com tamanho mínimo. */
export const normalizeCrop = (c: Crop): Crop => {
    const w = clamp(c.w, MIN_CROP, 1)
    const h = clamp(c.h, MIN_CROP, 1)
    return { x: clamp(c.x, 0, 1 - w), y: clamp(c.y, 0, 1 - h), w, h }
}

/** Encolhe o corte em volta do centro até ter a proporção `ratio` (largura/altura, em px). */
export const fitCropToRatio = (c: Crop, ratio: number, frameW: number, frameH: number): Crop => {
    const cx = c.x + c.w / 2
    const cy = c.y + c.h / 2
    const pw = c.w * frameW
    const ph = c.h * frameH
    let w = pw
    let h = ph
    if (pw / ph > ratio) w = ph * ratio
    else h = pw / ratio
    const nw = w / frameW
    const nh = h / frameH
    return normalizeCrop({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh })
}

/** Gira 90 graus: o corte acompanha a foto (a área escolhida continua a mesma). */
export const rotateGeometry = (g: Geometry, dir: 'cw' | 'ccw'): Geometry => {
    const { x, y, w, h } = g.crop
    const crop =
        dir === 'cw' ? { x: 1 - y - h, y: x, w: h, h: w } : { x: y, y: 1 - x - w, w: h, h: w }
    return { ...g, rotate: (g.rotate + (dir === 'cw' ? 1 : 3)) % 4, crop: normalizeCrop(crop) }
}

/**
 * Espelha o quadro final. Como o espelho vale para o que o usuário vê, com a foto girada em 90 ou 270
 * o espelho horizontal da tela é, na foto original, o vertical (e vice-versa).
 */
export const flipGeometry = (g: Geometry, axis: 'h' | 'v'): Geometry => {
    const odd = g.rotate % 2 === 1
    const onImageX = axis === 'h' ? !odd : odd
    const crop =
        axis === 'h'
            ? { ...g.crop, x: 1 - g.crop.x - g.crop.w }
            : { ...g.crop, y: 1 - g.crop.y - g.crop.h }
    return {
        ...g,
        flipX: onImageX ? !g.flipX : g.flipX,
        flipY: onImageX ? g.flipY : !g.flipY,
        crop: normalizeCrop(crop),
    }
}

export const ASPECTS = [
    { id: 'free', label: 'Livre', ratio: null },
    { id: 'original', label: 'Original', ratio: 'original' },
    { id: '1:1', label: '1:1', ratio: 1 },
    { id: '4:5', label: '4:5', ratio: 4 / 5 },
    { id: '5:4', label: '5:4', ratio: 5 / 4 },
    { id: '3:2', label: '3:2', ratio: 3 / 2 },
    { id: '2:3', label: '2:3', ratio: 2 / 3 },
    { id: '16:9', label: '16:9', ratio: 16 / 9 },
    { id: '9:16', label: '9:16', ratio: 9 / 16 },
] as const
export type AspectId = (typeof ASPECTS)[number]['id']

export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** Move a caixa de corte sem deixar sair do quadro. dx/dy em fração do quadro. */
export const moveCrop = (start: Crop, dx: number, dy: number): Crop =>
    normalizeCrop({
        ...start,
        x: clamp(start.x + dx, 0, 1 - start.w),
        y: clamp(start.y + dy, 0, 1 - start.h),
    })

/**
 * Redimensiona arrastando uma alça. dx/dy em fração do quadro. Com `ratio` (largura/altura em px),
 * só os cantos mantêm a proporção, ancorados no canto oposto.
 */
export const resizeCrop = (
    start: Crop,
    handle: CropHandle,
    dx: number,
    dy: number,
    ratio: number | null,
    frameW: number,
    frameH: number,
): Crop => {
    let left = start.x
    let top = start.y
    let right = start.x + start.w
    let bottom = start.y + start.h
    if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP)
    if (handle.includes('e')) right = clamp(right + dx, left + MIN_CROP, 1)
    if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP)
    if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN_CROP, 1)

    if (ratio !== null && handle.length === 2) {
        // Proporção travada: a largura manda; a altura sai dela, e as duas encolhem se bater na borda do quadro.
        const anchorX = handle.includes('w') ? start.x + start.w : start.x
        const anchorY = handle.includes('n') ? start.y + start.h : start.y
        const room = (handle.includes('w') ? anchorX : 1 - anchorX) * frameW
        const roomY = (handle.includes('n') ? anchorY : 1 - anchorY) * frameH
        let pw = Math.abs((handle.includes('w') ? anchorX - left : right - anchorX) * frameW)
        pw = Math.min(pw, room, roomY * ratio)
        pw = Math.max(pw, MIN_CROP * frameW)
        const ph = pw / ratio
        const w = pw / frameW
        const h = ph / frameH
        return normalizeCrop({
            x: handle.includes('w') ? anchorX - w : anchorX,
            y: handle.includes('n') ? anchorY - h : anchorY,
            w,
            h,
        })
    }
    return normalizeCrop({ x: left, y: top, w: right - left, h: bottom - top })
}
