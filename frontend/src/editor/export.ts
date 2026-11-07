// Exportação em resolução total: renderiza a original em blocos com o mesmo shader do preview.
// Sem corte/giro: recorta blocos da própria foto (funciona além do limite de textura da GPU).
// Com corte, giro, espelho, endireitar ou redimensionar: posiciona a foto transformada em cada bloco da saída.
import { Application, Rectangle, Sprite, Texture } from 'pixi.js'
import { frameSize, isIdentityGeometry, outputSize, straightenScale } from './geometry'
import { encodeJpeg } from './jpeg'
import type { Lut } from './lut'
import type { EditParams } from './params'
import { createEditFilter, type EditFilter } from './shader'
import { assertExportable, planTiles } from './tiles'

export type ExportFormat = 'image/jpeg' | 'image/png'

/** Etapas visíveis ao usuário: ler a foto, aplicar o filtro, gerar o arquivo. */
export type ExportPhase = 'decode' | 'render' | 'encode'

export type ExportOptions = {
    format: ExportFormat
    /** 0 a 1, só vale para JPEG. */
    quality: number
    /** LUT 3D importado na sessão (entra no resultado exportado). */
    lut?: Lut | null
    onProgress?: (done: number, total: number) => void
    onPhase?: (phase: ExportPhase) => void
}

/** Deixa o navegador pintar a nova etapa antes do trabalho pesado travar a thread. */
const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 30))

export const extensionFor = (format: ExportFormat) => (format === 'image/png' ? 'png' : 'jpg')

type Ctx2D = OffscreenCanvasRenderingContext2D

/** Foto inteira cabendo numa textura da GPU. Reduz com qualidade só se passar do limite ou se a saída for bem menor. */
const sourceFor = async (full: ImageBitmap, wantedFactor: number, gpuMax: number) => {
    const factor = Math.min(wantedFactor, gpuMax / Math.max(full.width, full.height))
    if (factor >= 1) return { bitmap: full, scale: 1, owned: false }
    const bitmap = await createImageBitmap(full, {
        resizeWidth: Math.max(1, Math.round(full.width * factor)),
        resizeHeight: Math.max(1, Math.round(full.height * factor)),
        resizeQuality: 'high',
    })
    return { bitmap, scale: bitmap.width / full.width, owned: true }
}

export const exportPhoto = async (
    original: Blob,
    params: EditParams,
    options: ExportOptions,
): Promise<Blob> => {
    options.onPhase?.('decode')
    await yieldToUi()
    // 'from-image' aplica o EXIF, igual ao preview: as duas saídas têm a mesma orientação.
    const full = await createImageBitmap(original, { imageOrientation: 'from-image' })
    const app = new Application()
    let source: ImageBitmap | null = null
    let edit: EditFilter | null = null
    try {
        const g = params.geometry
        const out = outputSize(full.width, full.height, g)
        assertExportable(out.w, out.h)

        await app.init({
            width: 1,
            height: 1,
            resolution: 1,
            autoDensity: false,
            antialias: false,
            backgroundAlpha: 0,
            autoStart: false,
            preference: 'webgl',
        })

        const gl = 'gl' in app.renderer ? app.renderer.gl : null
        const maxTexture = gl ? Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) : 4096
        const tiles = planTiles(out.w, out.h, maxTexture)

        const canvas = new OffscreenCanvas(out.w, out.h)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D indisponível')

        edit = createEditFilter(params)
        edit.filter.resolution = 1
        edit.setLut(options.lut ?? null)

        options.onPhase?.('render')
        await yieldToUi()
        let done = 0
        const progress = () => options.onProgress?.(++done, tiles.length)

        if (isIdentityGeometry(g)) {
            // Caminho de resolução total: recorta cada bloco da própria foto (com halo para o unsharp).
            for (const t of tiles) {
                const crop = await createImageBitmap(full, t.cx, t.cy, t.cw, t.ch)
                const sprite = new Sprite(Texture.from(crop))
                sprite.filters = [edit.filter]
                app.stage.addChild(sprite)
                edit.setTile({
                    originX: t.cx,
                    originY: t.cy,
                    fullW: full.width,
                    fullH: full.height,
                })
                app.renderer.resize(t.cw, t.ch)
                const rendered = app.renderer.extract.canvas(app.stage) as CanvasImageSource
                // Copia só a região útil: o halo existe apenas para o unsharp enxergar vizinhos.
                ;(ctx as Ctx2D).drawImage(
                    rendered,
                    t.x - t.cx,
                    t.y - t.cy,
                    t.w,
                    t.h,
                    t.x,
                    t.y,
                    t.w,
                    t.h,
                )
                sprite.filters = null
                app.stage.removeChild(sprite)
                sprite.destroy({ texture: true, textureSource: true })
                crop.close()
                progress()
            }
        } else {
            const fr = frameSize(full.width, full.height, g)
            const cropW = g.crop.w * fr.w
            // px do quadro -> px da saída (o corte pode ser redimensionado).
            const scale = out.w / cropW
            // Reduz bem antes de desenhar quando a saída é menor: a GPU sem mipmap serrilha reduções grandes.
            const src = await sourceFor(full, scale < 0.75 ? scale : 1, maxTexture)
            source = src.owned ? src.bitmap : null
            const sprite = new Sprite(Texture.from(src.bitmap))
            sprite.anchor.set(0.5)
            sprite.filters = [edit.filter]
            app.stage.addChild(sprite)

            // Mesma transformação do preview, só que em px da saída. P = onde cai o centro do quadro.
            const grow = straightenScale(fr.w, fr.h, g.straighten)
            const pxScale = (scale / src.scale) * grow
            const centerX = (fr.w / 2 - g.crop.x * fr.w) * scale
            const centerY = (fr.h / 2 - g.crop.y * fr.h) * scale
            sprite.rotation = (g.rotate * Math.PI) / 2 + (g.straighten * Math.PI) / 180
            sprite.scale.set(pxScale * (g.flipX ? -1 : 1), pxScale * (g.flipY ? -1 : 1))

            for (const t of tiles) {
                sprite.position.set(centerX - t.cx, centerY - t.cy)
                edit.setTile({ originX: t.cx, originY: t.cy, fullW: out.w, fullH: out.h })
                app.renderer.resize(t.cw, t.ch)
                // `frame` fixa a região extraída: a foto girada pode ser bem maior que o bloco.
                const rendered = app.renderer.extract.canvas({
                    target: app.stage,
                    frame: new Rectangle(0, 0, t.cw, t.ch),
                    resolution: 1,
                }) as CanvasImageSource
                ;(ctx as Ctx2D).drawImage(
                    rendered,
                    t.x - t.cx,
                    t.y - t.cy,
                    t.w,
                    t.h,
                    t.x,
                    t.y,
                    t.w,
                    t.h,
                )
                progress()
            }
            sprite.filters = null
            app.stage.removeChild(sprite)
            sprite.destroy({ texture: true, textureSource: true })
        }

        options.onPhase?.('encode')
        await yieldToUi()
        if (options.format === 'image/jpeg') {
            return await encodeJpeg(ctx.getImageData(0, 0, out.w, out.h), options.quality)
        }
        return await canvas.convertToBlob({ type: 'image/png' })
    } finally {
        full.close()
        source?.close()
        edit?.dispose()
        app.destroy(true, { children: true, texture: true })
    }
}
