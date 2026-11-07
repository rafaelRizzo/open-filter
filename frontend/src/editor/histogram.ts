// Histograma ao vivo: renderiza uma versão minúscula (192px) com o mesmo shader e lê os pixels.
// Throttled: no máximo uma leitura a cada ~120ms, sempre com os params mais recentes.
import { Application, Sprite, Texture } from 'pixi.js'
import type { Lut } from './lut'
import type { EditParams } from './params'
import { createEditFilter } from './shader'

const SIDE = 192
const THROTTLE_MS = 120

export type Histogram = {
    r: Uint32Array
    g: Uint32Array
    b: Uint32Array
    luma: Uint32Array
    /** Fração (0 a 1) de pixels com algum canal em 255 / em 0. */
    clipHigh: number
    clipLow: number
}

export const computeHistogram = (pixels: Uint8ClampedArray | Uint8Array): Histogram => {
    const r = new Uint32Array(256)
    const g = new Uint32Array(256)
    const b = new Uint32Array(256)
    const luma = new Uint32Array(256)
    let high = 0
    let low = 0
    const total = pixels.length / 4
    for (let i = 0; i < pixels.length; i += 4) {
        const pr = pixels[i] as number
        const pg = pixels[i + 1] as number
        const pb = pixels[i + 2] as number
        r[pr] = (r[pr] as number) + 1
        g[pg] = (g[pg] as number) + 1
        b[pb] = (b[pb] as number) + 1
        const y = Math.round(0.2126 * pr + 0.7152 * pg + 0.0722 * pb)
        luma[y] = (luma[y] as number) + 1
        if (pr === 255 || pg === 255 || pb === 255) high++
        if (pr === 0 || pg === 0 || pb === 0) low++
    }
    return { r, g, b, luma, clipHigh: total ? high / total : 0, clipLow: total ? low / total : 0 }
}

export type HistogramController = {
    update: (params: EditParams) => void
    setLut: (lut: Lut | null) => void
    subscribe: (listener: () => void) => () => void
    get: () => Histogram | null
    dispose: () => void
}

export const createHistogramController = (
    source: ImageBitmap,
    initial: EditParams,
    initialLut: Lut | null = null,
): HistogramController => {
    const listeners = new Set<() => void>()
    let latest = initial
    let current: Histogram | null = null
    let timer: ReturnType<typeof setTimeout> | null = null
    let disposed = false
    let ready = false
    let app: Application | null = null
    let sprite: Sprite | null = null
    let setParams: ((p: EditParams) => void) | null = null
    let applyLut: ((l: Lut | null) => void) | null = null
    let lut = initialLut

    const measure = () => {
        timer = null
        if (disposed || !ready || !app || !setParams) return
        setParams(latest)
        applyLut?.(lut)
        const { pixels } = app.renderer.extract.pixels(app.stage)
        current = computeHistogram(pixels)
        for (const l of listeners) l()
    }

    const schedule = () => {
        if (timer || disposed) return
        timer = setTimeout(measure, THROTTLE_MS)
    }

    const init = async () => {
        const scale = Math.min(1, SIDE / Math.max(source.width, source.height))
        const w = Math.max(1, Math.round(source.width * scale))
        const h = Math.max(1, Math.round(source.height * scale))
        const instance = new Application()
        await instance.init({
            width: w,
            height: h,
            resolution: 1,
            autoDensity: false,
            antialias: false,
            backgroundAlpha: 0,
            autoStart: false,
            preference: 'webgl',
        })
        if (disposed) {
            instance.destroy(true, { children: true, texture: true })
            return
        }
        const edit = createEditFilter(latest)
        edit.filter.resolution = 1
        // Sem o retângulo da imagem a vinheta e os raios usam o padrão 1x1 e saem errados.
        edit.setTile({ originX: 0, originY: 0, fullW: w, fullH: h })
        sprite = new Sprite(Texture.from(source))
        sprite.scale.set(w / source.width)
        sprite.filters = [edit.filter]
        instance.stage.addChild(sprite)
        app = instance
        setParams = edit.setParams
        applyLut = edit.setLut
        ready = true
        schedule()
    }
    // Falha de histograma não é crítica: o painel só fica vazio.
    init().catch(() => undefined)

    return {
        update(params) {
            latest = params
            schedule()
        },
        setLut(next) {
            lut = next
            schedule()
        },
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
        get: () => current,
        dispose() {
            disposed = true
            if (timer) clearTimeout(timer)
            listeners.clear()
            if (sprite) sprite.filters = null
            app?.destroy(true, { children: true, texture: true })
            app = null
        },
    }
}
