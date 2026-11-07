// Hooks do TanStack Query sobre o IndexedDB: usePhotos, usePhoto e importação.
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { defaultParams } from '@/editor/params'
import { deletePhoto, getPhoto, listPhotos, type PhotoRecord, putPhoto } from './db'
import { decodePhoto } from './decode'
import { makeThumbnail } from './thumbnail'
import { validateImageFile } from './validate'

/** Foto que não existe neste navegador (link de outra pessoa/aparelho, ou dados limpos). */
export class PhotoNotFoundError extends Error {
    constructor() {
        super('Foto não encontrada')
        this.name = 'PhotoNotFoundError'
    }
}

export const photosQuery = () => queryOptions({ queryKey: ['photos'], queryFn: listPhotos })

export const photoQuery = (id: string) =>
    queryOptions({
        queryKey: ['photos', id],
        queryFn: async () => {
            const photo = await getPhoto(id)
            if (!photo) throw new PhotoNotFoundError()
            return photo
        },
    })

export const usePhotos = () => useQuery(photosQuery())

export const usePhoto = (id: string) => useQuery(photoQuery(id))

export const useImportPhoto = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (file: File): Promise<PhotoRecord> => {
            // Defesa em profundidade: qualquer caminho de importação passa pela mesma validação.
            await validateImageFile(file, file.name)
            const { preview, width, height } = await decodePhoto(file)
            const thumbnailBlob = await makeThumbnail(preview)
            preview.close()
            const record: PhotoRecord = {
                id: crypto.randomUUID(),
                originalBlob: file,
                thumbnailBlob,
                name: file.name,
                width,
                height,
                params: defaultParams(),
                updatedAt: Date.now(),
            }
            await putPhoto(record)
            return record
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['photos'] }),
    })
}

export const useDeletePhoto = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: deletePhoto,
        onSuccess: (_data, id) => {
            qc.removeQueries({ queryKey: ['photos', id] })
            return qc.invalidateQueries({ queryKey: ['photos'] })
        },
    })
}
