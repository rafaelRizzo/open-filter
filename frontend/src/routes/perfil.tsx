// Perfil: conta, armazenamento, backup das fotos e aparência. Aberto para visitantes também.
import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/ui/profile-page'

export const Route = createFileRoute('/perfil')({ component: ProfilePage })
