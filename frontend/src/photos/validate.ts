// Validação de imagens: confere o conteúdo do arquivo (não só o nome ou o tipo declarado) e os limites.
import { formatBytes } from '@/lib/storage'
import { deletePhoto, listPhotos } from './db'
import { formatMegapixels, MAX_FILE_BYTES, MAX_IMPORT_PIXELS } from './limits'

export class ImageRejectedError extends Error {}

const ascii = (bytes: Uint8Array, start: number, end: number) =>
    String.fromCharCode(...bytes.slice(start, end))

/** Lê os primeiros bytes e devolve o formato real, ou null se não for uma imagem aceita. */
export const sniffImageType = async (blob: Blob): Promise<string | null> => {
    const head = new Uint8Array(await blob.slice(0, 32).arrayBuffer())
    if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg'
    if (ascii(head, 1, 4) === 'PNG' && head[0] === 0x89) return 'image/png'
    if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'image/webp'
    if (ascii(head, 0, 3) === 'GIF') return 'image/gif'
    if (ascii(head, 0, 2) === 'BM') return 'image/bmp'
    // AVIF e HEIC: caixa "ftyp" e a marca do formato logo depois.
    if (ascii(head, 4, 8) === 'ftyp') {
        const brand = ascii(head, 8, 12)
        if (brand === 'avif' || brand === 'avis') return 'image/avif'
    }
    return null
}

/** Dimensões lidas do cabeçalho: não decodifica a imagem inteira, então é barato mesmo em foto gigante. */
const readDimensions = (blob: Blob) =>
    new Promise<{ width: number; height: number }>((resolve, reject) => {
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight })
            URL.revokeObjectURL(url)
        }
        img.onerror = () => {
            reject(new ImageRejectedError('Não foi possível ler esta imagem'))
            URL.revokeObjectURL(url)
        }
        img.src = url
    })

/** Recusa o que não é imagem de verdade, é grande demais em bytes ou em pixels. */
export const validateImageFile = async (file: Blob, name = 'arquivo') => {
    if (file.size === 0) throw new ImageRejectedError(`${name}: arquivo vazio`)
    if (file.size > MAX_FILE_BYTES)
        throw new ImageRejectedError(
            `${name}: tem ${formatBytes(file.size)} e o máximo é ${formatBytes(MAX_FILE_BYTES)}`,
        )
    if (!(await sniffImageType(file)))
        throw new ImageRejectedError(
            `${name}: não é uma imagem (use JPEG, PNG, WebP, AVIF, GIF ou BMP)`,
        )
    const { width, height } = await readDimensions(file)
    if (width * height > MAX_IMPORT_PIXELS)
        throw new ImageRejectedError(
            `${name}: tem ${formatMegapixels(width * height)} e o máximo é ${formatMegapixels(MAX_IMPORT_PIXELS)}`,
        )
}

/**
 * Apaga do álbum o que não é imagem (arquivo trocado no IndexedDB, backup adulterado).
 * Só olha os bytes iniciais: não apaga foto válida que apenas falhou ao decodificar.
 * Devolve quantos itens removeu.
 */
export const purgeInvalidPhotos = async (): Promise<number> => {
    let removed = 0
    for (const photo of await listPhotos()) {
        if (await sniffImageType(photo.originalBlob)) continue
        await deletePhoto(photo.id)
        removed++
    }
    return removed
}
