// Testes do ImportButton: abre o seletor, importa, navega; erro mostra toast; sem arquivo não faz nada.
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ImportButton } from './import-button'

const { navigate, mutateAsync, toast } = vi.hoisted(() => ({
    navigate: vi.fn(),
    mutateAsync: vi.fn(),
    toast: Object.assign(vi.fn(), {
        loading: vi.fn(() => 'toast-id'),
        success: vi.fn(),
        error: vi.fn(),
    }),
}))

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigate }))
vi.mock('sonner', () => ({ toast }))
vi.mock('@/photos/queries', () => ({ useImportPhoto: () => ({ mutateAsync, isPending: false }) }))

const fileInput = (container: HTMLElement) =>
    container.querySelector('input[type=file]') as HTMLInputElement

beforeEach(() => vi.clearAllMocks())

describe('ImportButton', () => {
    it('o botão aciona o seletor de arquivo', () => {
        const { container } = render(<ImportButton />)
        const click = vi.spyOn(fileInput(container), 'click')
        fireEvent.click(screen.getByRole('button', { name: /importar foto/i }))
        expect(click).toHaveBeenCalledOnce()
    })

    it('importa e navega para o editor', async () => {
        mutateAsync.mockResolvedValue({ id: 'p1' })
        const { container } = render(<ImportButton />)
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' })

        fireEvent.change(fileInput(container), { target: { files: [file] } })

        await vi.waitFor(() =>
            expect(navigate).toHaveBeenCalledWith({
                to: '/editor/$photoId',
                params: { photoId: 'p1' },
            }),
        )
        expect(mutateAsync).toHaveBeenCalledWith(file)
        expect(toast.success).toHaveBeenCalledWith('Foto importada', { id: 'toast-id' })
    })

    it('mostra erro e não navega se a imagem for inválida', async () => {
        mutateAsync.mockRejectedValue(new Error('bad'))
        const { container } = render(<ImportButton />)

        fireEvent.change(fileInput(container), { target: { files: [new File(['x'], 'a.txt')] } })

        await vi.waitFor(() => expect(toast.error).toHaveBeenCalled())
        expect(navigate).not.toHaveBeenCalled()
    })

    it('sem arquivo selecionado não faz nada', () => {
        const { container } = render(<ImportButton />)
        fireEvent.change(fileInput(container), { target: { files: [] } })
        expect(mutateAsync).not.toHaveBeenCalled()
    })
})
