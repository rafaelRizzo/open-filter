// Backup e restauração: ZIP com as fotos originais e um ajustes.json (nome, medidas e params de cada foto).
import { z } from 'zod'
import { paramsSchema } from '@/editor/params'
import { listPhotos, type PhotoRecord, putPhoto } from './db'
import { decodePhoto } from './decode'
import { makeThumbnail } from './thumbnail'
import { validateImageFile } from './validate'
import { createZip, readZip } from './zip'

const manifestSchema = z.object({
    version: z.literal(1),
    photos: z.array(
        z.object({
            id: z.string(),
            file: z.string(),
            name: z.string(),
            width: z.number(),
            height: z.number(),
            updatedAt: z.number(),
            params: z.unknown(),
        }),
    ),
})

const extensionOf = (blob: Blob) =>
    blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'

// O zip não guarda MIME: o tipo volta pela extensão do arquivo.
const mimeOf = (file: string) =>
    file.endsWith('.png') ? 'image/png' : file.endsWith('.webp') ? 'image/webp' : 'image/jpeg'

export const createBackup = async (): Promise<{ blob: Blob; count: number }> => {
    const photos = await listPhotos()
    if (photos.length === 0) throw new Error('Não há fotos para exportar')
    const entries = photos.map((p) => ({
        name: `fotos/${p.id}.${extensionOf(p.originalBlob)}`,
        data: p.originalBlob,
    }))
    const manifest = {
        version: 1,
        photos: photos.map((p, i) => ({
            id: p.id,
            file: (entries[i] as { name: string }).name,
            name: p.name,
            width: p.width,
            height: p.height,
            updatedAt: p.updatedAt,
            params: p.params,
        })),
    }
    entries.push({
        name: 'ajustes.json',
        data: new Blob([JSON.stringify(manifest)], { type: 'application/json' }),
    })
    return { blob: await createZip(entries), count: photos.length }
}

/** Restaura fotos de um backup. Devolve quantas foram importadas (as que falham são puladas). */
export const restoreBackup = async (file: Blob): Promise<number> => {
    const files = await readZip(file)
    const raw = files.get('ajustes.json')
    if (!raw) throw new Error('Este arquivo não é um backup do open-filter')
    const manifest = manifestSchema.parse(JSON.parse(await raw.text()))

    let restored = 0
    for (const item of manifest.photos) {
        const original = files.get(item.file)
        if (!original) continue
        try {
            // Entradas do zip que não são imagem (ou passam dos limites) são puladas, nunca gravadas.
            await validateImageFile(original, item.name)
            const { preview, width, height } = await decodePhoto(original)
            const thumbnailBlob = await makeThumbnail(preview)
            preview.close()
            const record: PhotoRecord = {
                id: item.id,
                originalBlob: new Blob([original], { type: original.type || mimeOf(item.file) }),
                thumbnailBlob,
                name: item.name,
                width,
                height,
                // Params inválidos viram o padrão em vez de derrubar a restauração inteira.
                params: paramsSchema.catch(() => paramsSchema.parse({})).parse(item.params),
                updatedAt: item.updatedAt,
            }
            await putPhoto(record)
            restored++
        } catch {
            // foto corrompida no backup: segue para a próxima
        }
    }
    return restored
}
