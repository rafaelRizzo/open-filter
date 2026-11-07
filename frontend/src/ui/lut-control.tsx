// Importar LUT 3D (.cube): aplica sobre a foto, com intensidade. O LUT vale só nesta sessão (não vai nos presets).
import { FileUp, X } from 'lucide-react'
import { useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { Lut } from '@/editor/lut'
import type { EditParams, ParamKey } from '@/editor/params'
import { Hint } from '@/ui/hint'
import { ParamSlider } from './param-slider'

type Props = {
    lut: Lut | null
    params: EditParams
    onChange: (key: ParamKey, value: number) => void
    onCommit: () => void
    onImport: (file: File) => Promise<void>
    onRemove: () => void
}

export function LutControl({ lut, params, onChange, onCommit, onImport, onRemove }: Props) {
    const inputRef = useRef<HTMLInputElement>(null)

    return (
        <section className="flex flex-col gap-3 rounded-lg border p-3">
            <h3 className="text-sm font-medium">LUT 3D (.cube)</h3>
            <input
                ref={inputRef}
                type="file"
                accept=".cube"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (file)
                        onImport(file).catch((err) =>
                            toast.error(err instanceof Error ? err.message : 'LUT inválido'),
                        )
                }}
            />
            {lut ? (
                <>
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <Hint label={lut.name}>
                            <span className="truncate">
                                {lut.name} ({lut.size}³)
                            </span>
                        </Hint>
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label="Remover LUT"
                            onClick={onRemove}
                        >
                            <X />
                        </Button>
                    </div>
                    <ParamSlider
                        paramKey="lutStrength"
                        initial={params.lutStrength}
                        onChange={onChange}
                        onCommit={onCommit}
                    />
                </>
            ) : (
                <>
                    <p className="text-muted-foreground text-xs text-pretty">
                        Arquivo .cube de um colorista. Vale só nesta sessão e na exportação.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                        <FileUp data-icon="inline-start" />
                        Importar LUT
                    </Button>
                </>
            )}
        </section>
    )
}
