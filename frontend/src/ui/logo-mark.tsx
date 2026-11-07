// Símbolo do open-filter (rampa de exposição): círculo em faixas que engrossam. Herda a cor do texto.
import type { SVGProps } from 'react'

export function LogoMark(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M128.00 24L128.00 24A104 104 0 0 1 176.50 36L79.50 36A104 104 0 0 1 128.00 24ZM64.03 46L191.97 46A104 104 0 0 1 214.32 70L41.68 70A104 104 0 0 1 64.03 46ZM35.74 80L220.26 80A104 104 0 0 1 231.31 116L24.69 116A104 104 0 0 1 35.74 80ZM24.02 126L231.98 126A104 104 0 0 1 221.27 174L34.73 174A104 104 0 0 1 24.02 126ZM40.36 184L215.64 184A104 104 0 0 1 128.00 232L128.00 232A104 104 0 0 1 40.36 184Z" />
        </svg>
    )
}
