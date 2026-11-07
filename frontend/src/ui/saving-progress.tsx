// Barra de progresso com frases para operações de rede sem progresso real (ex: salvar preset).
// Avança rápido e desacelera até 90%; só chega a 100% quando `done` vira true.
import { useEffect, useState } from 'react'

const MAX_WAITING = 90
const DEFAULT_STEPS = [
    'Lendo os seus ajustes...',
    'Empacotando o filtro...',
    'Enviando para a sua conta...',
    'Guardando com carinho...',
    'Quase lá...',
]

type Props = {
    done: boolean
    doneText?: string
    steps?: readonly string[]
}

export function SavingProgress({ done, doneText = 'Pronto!', steps = DEFAULT_STEPS }: Props) {
    const [percent, setPercent] = useState(4)

    useEffect(() => {
        if (done) {
            setPercent(100)
            return
        }
        const id = setInterval(() => setPercent((p) => p + (MAX_WAITING - p) * 0.06), 150)
        return () => clearInterval(id)
    }, [done])

    const step = Math.min(Math.floor((percent / MAX_WAITING) * steps.length), steps.length - 1)
    const text = done ? doneText : steps[step]

    return (
        <div className="flex flex-col gap-1.5">
            <div
                role="progressbar"
                aria-label="Progresso do salvamento"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(percent)}
                className="bg-muted h-2 overflow-hidden rounded-full"
            >
                <div
                    className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <p className="text-muted-foreground text-xs" role="status">
                {text}
            </p>
        </div>
    )
}
