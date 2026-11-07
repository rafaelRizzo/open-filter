// Landing page: apresenta o projeto, mostra o editor ao vivo e leva ao estúdio (/app).
import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/ui/landing/landing-page'

export const Route = createFileRoute('/')({ component: LandingPage })
