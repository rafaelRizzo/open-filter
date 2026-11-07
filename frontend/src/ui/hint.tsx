// Tooltip do shadcn no lugar do atributo title. `wrap` serve para botão desabilitado, que não recebe mouse.
import type { ReactElement, ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Props = {
    label: ReactNode
    children: ReactElement<Record<string, unknown>>
    side?: 'top' | 'bottom' | 'left' | 'right'
    wrap?: boolean
}

export function Hint({ label, children, side, wrap }: Props) {
    if (!label) return children
    return (
        <Tooltip>
            <TooltipTrigger
                render={wrap ? <span className="inline-flex">{children}</span> : children}
            />
            <TooltipContent side={side}>{label}</TooltipContent>
        </Tooltip>
    )
}
