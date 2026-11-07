// Entrada padrão das telas: sobe um pouco com fade, escalonada por índice (ou ao rolar até o bloco).
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

const tags = {
    div: motion.div,
    li: motion.li,
    section: motion.section,
    header: motion.header,
    footer: motion.footer,
}

type Props = {
    as?: keyof typeof tags
    /** Posição na fila: cada índice atrasa 60 ms (limite de 400 ms). */
    i?: number
    /** Espera o bloco aparecer na tela em vez de animar ao montar (seções abaixo da dobra). */
    inView?: boolean
    className?: string
    children: ReactNode
}

export function Enter({ as = 'div', i = 0, inView = false, className, children }: Props) {
    const Tag = tags[as]
    const transition = {
        duration: 0.35,
        delay: Math.min(i * 0.06, 0.4),
        ease: [0.22, 1, 0.36, 1],
    } as const
    const from = { opacity: 0, y: 12 }
    const to = { opacity: 1, y: 0 }
    return inView ? (
        <Tag
            className={className}
            initial={from}
            whileInView={to}
            viewport={{ once: true, amount: 0.15 }}
            transition={transition}
        >
            {children}
        </Tag>
    ) : (
        <Tag className={className} initial={from} animate={to} transition={transition}>
            {children}
        </Tag>
    )
}
