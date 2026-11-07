// Esqueleto do editor em 3 fases: uma caixa pequena no centro, ela cresce e vai para a esquerda abrindo as
// outras duas com resize, e só então os blocos de dentro montam um de cada vez com brilho.
import { motion } from 'motion/react'
import { createContext, useContext, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Dir = 1 | -1

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const isDesktop = () => window.matchMedia('(min-width: 768px)').matches

// Intervalo entre um bloco e o próximo; cada painel começa num momento.
const STEP = 0.05
const START = { left: 0, right: 0.25, center: 0.5 }
const atLeft = (n: number) => START.left + n * STEP
const atRight = (n: number) => START.right + n * STEP
const atCenter = (n: number) => START.center + n * STEP

/** Tempo mínimo na tela: a animação completa (caixas abrindo e blocos entrando) roda inteira mesmo com a foto em cache. */
export const SKELETON_MIN_MS = 1500

const SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const

// Blocos internos só aparecem quando as caixas terminam de abrir.
const ShowBones = createContext(false)

/** Bloco cinza que aparece com fade no seu tempo e tem um brilho atravessando (dir 1: direita, -1: esquerda). */
function Bone({ className, dir, at }: { className?: string; dir: Dir; at: number }) {
    const show = useContext(ShowBones)
    return (
        <motion.div
            className={cn('bg-skeleton relative overflow-hidden rounded-md', className)}
            initial={false}
            animate={{ opacity: show ? 1 : 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: show ? at : 0 }}
        >
            {show && (
                <motion.span
                    className="via-foreground/10 absolute inset-0 bg-linear-to-r from-transparent to-transparent"
                    initial={{ x: `${-100 * dir}%` }}
                    animate={{ x: `${100 * dir}%` }}
                    transition={{ duration: 1.6, ease: 'linear', repeat: Infinity, delay: at }}
                />
            )}
        </motion.div>
    )
}

export function EditorSkeleton() {
    // 0: só a caixa pequena no centro. 1: cresce, vai para a esquerda e abre as outras. 2: monta os blocos.
    const [phase, setPhase] = useState(0)
    const [desktop] = useState(isDesktop)

    useEffect(() => {
        const t1 = setTimeout(() => setPhase(1), 40)
        const t2 = setTimeout(() => setPhase(2), 650)
        return () => {
            clearTimeout(t1)
            clearTimeout(t2)
        }
    }, [])

    const open = phase >= 1

    return (
        <ShowBones.Provider value={phase >= 2}>
            <motion.div
                role="status"
                aria-label="Carregando o editor"
                className="flex flex-col gap-3 max-md:overflow-y-auto md:h-full md:min-h-0 md:flex-row md:items-center md:justify-center md:gap-0"
            >
                {/* Presets (esquerda): nasce pequena no centro, cresce até a altura toda */}
                <motion.div
                    className="order-2 shrink-0 md:order-1 md:w-72"
                    initial={desktop ? { height: '30%', opacity: 1 } : { opacity: 0 }}
                    animate={
                        desktop ? { height: open ? '100%' : '30%', opacity: 1 } : { opacity: 1 }
                    }
                    transition={SPRING}
                >
                    <Card
                        size="sm"
                        className="h-full gap-3 overflow-hidden border border-foreground/15 p-3 ring-0"
                    >
                        <div className="flex items-center gap-2">
                            <Bone className="size-4" dir={1} at={atLeft(0)} />
                            <Bone className="h-5 w-20" dir={1} at={atLeft(1)} />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <Bone className="h-8 w-36 rounded-lg" dir={1} at={atLeft(2)} />
                            <Bone className="h-8 w-20 rounded-lg" dir={1} at={atLeft(3)} />
                        </div>
                        <Bone
                            className="h-9 w-full rounded-lg max-sm:hidden"
                            dir={1}
                            at={atLeft(4)}
                        />
                        <Bone className="h-8 w-full rounded-lg" dir={1} at={atLeft(5)} />
                        <div className="flex gap-2 md:grid md:grid-cols-3 md:gap-x-2 md:gap-y-3">
                            {range(12).map((i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5',
                                        i > 4 && 'max-md:hidden',
                                    )}
                                >
                                    <Bone
                                        className="aspect-square w-20 rounded-md md:w-full"
                                        dir={1}
                                        at={atLeft(6 + i)}
                                    />
                                    <Bone className="h-3 w-3/4" dir={1} at={atLeft(6 + i)} />
                                </div>
                            ))}
                        </div>
                    </Card>
                </motion.div>

                {/* Foto (centro): abre ocupando o espaço que sobra */}
                <motion.div
                    className="bg-card relative order-1 grid h-[58dvh] shrink-0 place-items-center overflow-hidden rounded-xl border border-foreground/15 md:order-2 md:h-full md:min-h-0 md:min-w-0 md:shrink"
                    initial={
                        desktop
                            ? { flexGrow: 0, flexBasis: 0, marginLeft: 0, opacity: 0 }
                            : { opacity: 0 }
                    }
                    animate={
                        desktop
                            ? {
                                  flexGrow: open ? 1 : 0,
                                  flexBasis: 0,
                                  marginLeft: open ? 12 : 0,
                                  opacity: open ? 1 : 0,
                              }
                            : { opacity: 1 }
                    }
                    transition={SPRING}
                >
                    <Bone className="aspect-[3/4] h-[88%] rounded-sm" dir={-1} at={atCenter(0)} />
                    <Bone
                        className="absolute top-3 right-3 h-8 w-24 rounded-lg"
                        dir={-1}
                        at={atCenter(1)}
                    />
                    <Bone
                        className="absolute bottom-3 left-3 h-10 w-72 max-w-[60%] rounded-xl"
                        dir={1}
                        at={atCenter(2)}
                    />
                    <Bone
                        className="absolute right-3 bottom-3 h-8 w-40 max-w-[30%] rounded-lg"
                        dir={-1}
                        at={atCenter(3)}
                    />
                </motion.div>

                {/* Ajustes (direita): a largura vai de 0 a 20rem; o conteúdo tem largura fixa para não espremer */}
                <motion.aside
                    className="order-3 h-[42dvh] shrink-0 overflow-hidden md:h-full"
                    initial={desktop ? { width: 0, marginLeft: 0, opacity: 0 } : { opacity: 0 }}
                    animate={
                        desktop
                            ? {
                                  width: open ? 320 : 0,
                                  marginLeft: open ? 12 : 0,
                                  opacity: open ? 1 : 0,
                              }
                            : { opacity: 1 }
                    }
                    transition={SPRING}
                >
                    <Card
                        size="sm"
                        className="h-full gap-0 overflow-hidden border border-foreground/15 py-0 ring-0 md:w-80"
                    >
                        <div className="flex flex-col gap-3 border-b p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Bone className="h-6 w-32" dir={-1} at={atRight(0)} />
                                <Bone className="h-6 w-28 rounded-lg" dir={-1} at={atRight(1)} />
                            </div>
                            <Bone
                                className="hidden h-24 w-full rounded-lg md:block"
                                dir={-1}
                                at={atRight(2)}
                            />
                            <div className="grid grid-cols-8 gap-1 md:grid-cols-4">
                                {range(8).map((i) => (
                                    <Bone
                                        key={i}
                                        className="h-10 md:h-12"
                                        dir={-1}
                                        at={atRight(3 + i)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-3">
                            {range(6).map((i) => (
                                <div key={i} className="flex flex-col gap-2.5">
                                    <div className="flex items-center justify-between">
                                        <Bone
                                            className="h-4 w-24"
                                            dir={-1}
                                            at={atRight(11 + i * 2)}
                                        />
                                        <Bone
                                            className="h-4 w-12"
                                            dir={-1}
                                            at={atRight(11 + i * 2)}
                                        />
                                    </div>
                                    <Bone
                                        className="h-2 w-full rounded-full"
                                        dir={-1}
                                        at={atRight(12 + i * 2)}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="shrink-0 border-t p-3">
                            <Bone className="h-8 w-full rounded-lg" dir={-1} at={atRight(23)} />
                        </div>
                    </Card>
                </motion.aside>
            </motion.div>
        </ShowBones.Provider>
    )
}
