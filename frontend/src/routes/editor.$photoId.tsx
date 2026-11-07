// Editor: loader pré-carrega a foto via ensureQueryData; canvas central (sliders nas próximas etapas).
import { createFileRoute } from '@tanstack/react-router'
import { photoQuery } from '@/photos/queries'
import { publicPresetsQuery } from '@/presets/queries'
import { PhotoEditorView } from '@/ui/photo-editor-view'
import { PhotoUnavailable } from '@/ui/photo-unavailable'

export const Route = createFileRoute('/editor/$photoId')({
    loader: async ({ context, params }) => {
        // Presets não bloqueiam o editor (rede lenta deixava a tela preta): a faixa tem o próprio loading.
        void context.queryClient.prefetchQuery(publicPresetsQuery())
        return context.queryClient.ensureQueryData(photoQuery(params.photoId))
    },
    // Carregar do IndexedDB é rápido: só mostra o indicador de espera se passar de 150 ms, sem tempo mínimo.
    pendingMs: 150,
    pendingMinMs: 0,
    errorComponent: ({ error }) => <PhotoUnavailable error={error} />,
    component: EditorPage,
})

function EditorPage() {
    const { photoId } = Route.useParams()
    return (
        <div className="h-full p-3 sm:p-6">
            <PhotoEditorView photoId={photoId} />
        </div>
    )
}
