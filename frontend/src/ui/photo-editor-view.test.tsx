// Testes do PhotoEditorView: skeleton, erro, canvas após decode e liberação do bitmap.
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PhotoEditorView } from './photo-editor-view'

const usePhoto = vi.fn()
const decodePhoto = vi.fn()

vi.mock('@/photos/queries', () => ({ usePhoto: (id: string) => usePhoto(id) }))
vi.mock('@/photos/decode', () => ({ decodePhoto: (b: Blob) => decodePhoto(b) }))
vi.mock('@/editor/photo-canvas', () => ({ PhotoCanvas: () => <div data-testid="canvas" /> }))

const photo = { originalBlob: new Blob(['x']) }

beforeEach(() => vi.clearAllMocks())

describe('PhotoEditorView', () => {
    it('mostra skeleton enquanto carrega', () => {
        usePhoto.mockReturnValue({ data: undefined, isError: false })
        const { container } = render(<PhotoEditorView photoId="1" />)
        expect(screen.queryByTestId('canvas')).toBeNull()
        expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    })

    it('mostra mensagem de erro', () => {
        usePhoto.mockReturnValue({ data: undefined, isError: true })
        render(<PhotoEditorView photoId="1" />)
        expect(screen.getByText(/não foi possível abrir/i)).toBeTruthy()
    })

    it('mostra o canvas depois de decodificar e fecha o bitmap ao desmontar', async () => {
        const preview = { close: vi.fn() }
        usePhoto.mockReturnValue({ data: photo, isError: false })
        decodePhoto.mockResolvedValue({ preview })

        const { unmount } = render(<PhotoEditorView photoId="1" />)
        expect(await screen.findByTestId('canvas')).toBeTruthy()

        unmount()
        expect(preview.close).toHaveBeenCalledOnce()
    })

    it('fecha o bitmap se desmontar antes do decode terminar', async () => {
        const preview = { close: vi.fn() }
        let resolve: (v: unknown) => void = () => {}
        decodePhoto.mockReturnValue(new Promise((r) => (resolve = r)))
        usePhoto.mockReturnValue({ data: photo, isError: false })

        const { unmount } = render(<PhotoEditorView photoId="1" />)
        unmount()
        resolve({ preview })

        await vi.waitFor(() => expect(preview.close).toHaveBeenCalledOnce())
    })
})
