// Limites de importação e exportação de fotos: protegem a memória do aparelho de quem usa o site.

/** Tamanho máximo do arquivo importado. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024
/** Megapixels máximos da foto importada (uma cópia dela em memória ocupa 4 bytes por pixel). */
export const MAX_IMPORT_PIXELS = 150_000_000
/** Teto de pixels da imagem exportada em aparelhos com pouca memória. */
const LOW_MEMORY_EXPORT_PIXELS = 50_000_000
const DEFAULT_EXPORT_PIXELS = 150_000_000

/** `navigator.deviceMemory` (GB, arredondado) existe só em navegadores Chromium. */
const deviceMemoryGb = () =>
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? Number.POSITIVE_INFINITY

/** Pixels máximos da exportação: o pico de memória é de uns 5 buffers do tamanho da imagem. */
export const exportPixelLimit = () =>
    deviceMemoryGb() <= 4 ? LOW_MEMORY_EXPORT_PIXELS : DEFAULT_EXPORT_PIXELS

export const formatMegapixels = (pixels: number) => `${Math.round(pixels / 1_000_000)} megapixels`
