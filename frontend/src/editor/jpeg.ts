// Codifica JPEG com MozJPEG (WebAssembly), 20% a 30% menor que o JPEG nativo na mesma qualidade.
// O codec só é baixado na primeira exportação em JPEG.
import wasmUrl from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url'

let ready: Promise<typeof import('@jsquash/jpeg/encode.js')> | null = null

const load = () => {
    ready ??= (async () => {
        const [mod, module] = await Promise.all([
            import('@jsquash/jpeg/encode.js'),
            WebAssembly.compileStreaming(fetch(wasmUrl)),
        ])
        await mod.init(module)
        return mod
    })().catch((error: unknown) => {
        // Permite tentar de novo (ex: rede caiu no primeiro download do codec).
        ready = null
        throw error
    })
    return ready
}

/** `quality` de 0 a 1. */
export const encodeJpeg = async (image: ImageData, quality: number): Promise<Blob> => {
    const mod = await load()
    const buffer = await mod.default(image, { quality: Math.round(quality * 100) })
    return new Blob([buffer], { type: 'image/jpeg' })
}
