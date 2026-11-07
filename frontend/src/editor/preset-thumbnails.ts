// Gera miniaturas "com o preset aplicado" usando o mesmo shader, num único canvas WebGL reaproveitado.
import { Application, Sprite, Texture } from 'pixi.js'
import type { EditParams } from './params'
import { createEditFilter, type EditFilter } from './shader'

export type ThumbRequest = { id: string; params: EditParams }

/** Devolve id -> data URL (JPEG). `isCancelled` permite abortar se o componente desmontar. */
export const renderPresetThumbnails = async (
    source: ImageBitmap,
    requests: readonly ThumbRequest[],
    isCancelled: () => boolean,
): Promise<Map<string, string>> => {
    const result = new Map<string, string>()
    if (requests.length === 0) return result

    const app = new Application()
    let sprite: Sprite | null = null
    let edit: EditFilter | null = null
    try {
        await app.init({
            width: source.width,
            height: source.height,
            resolution: 1,
            autoDensity: false,
            antialias: false,
            backgroundAlpha: 0,
            autoStart: false,
            preference: 'webgl',
        })

        const first = requests[0]
        if (!first) return result
        edit = createEditFilter(first.params)
        edit.filter.resolution = 1
        // A imagem ocupa o canvas inteiro: sem isso a vinheta sai pesada e os raios de claridade e nitidez, errados.
        edit.setTile({ originX: 0, originY: 0, fullW: source.width, fullH: source.height })
        sprite = new Sprite(Texture.from(source))
        sprite.filters = [edit.filter]
        app.stage.addChild(sprite)

        for (const req of requests) {
            if (isCancelled()) break
            edit.setParams(req.params)
            const canvas = app.renderer.extract.canvas(app.stage)
            result.set(req.id, (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.8))
        }
    } finally {
        // Solta o filtro antes de destruir a textura: evita o aviso de textura destruída ainda ligada.
        if (sprite) sprite.filters = null
        edit?.dispose()
        app.destroy(true, { children: true, texture: true })
    }
    return result
}
