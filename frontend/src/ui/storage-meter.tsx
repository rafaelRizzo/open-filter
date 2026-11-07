// Medidor compacto do espaço do navegador: quanto as fotos usam e quanto ainda cabe (aviso quando está acabando).
import { HardDrive } from 'lucide-react'
import { useEffect } from 'react'
import { formatBytes, freeBytes, LOW_QUOTA_BYTES, useStorageInfo } from '@/lib/storage'
import { cn } from '@/lib/utils'

const WARN = 80
const CRITICAL = 95

/** `refreshKey` muda quando as fotos mudam (importar, excluir): o medidor se atualiza. */
export function StorageMeter({ refreshKey }: { refreshKey: unknown }) {
    const { info, refresh } = useStorageInfo()
    // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey só dispara a releitura
    useEffect(refresh, [refresh, refreshKey])
    if (!info?.supported || info.quota <= 0) return null

    const percent = Math.min(100, (info.usage / info.quota) * 100)
    const level = percent >= CRITICAL ? 'critical' : percent >= WARN ? 'warn' : 'ok'

    return (
        <div className="flex min-w-48 flex-col gap-1 text-xs">
            <div className="flex items-center justify-between gap-3 tabular-nums">
                <span className="text-muted-foreground flex items-center gap-1.5">
                    <HardDrive className="size-3.5" />
                    {formatBytes(info.usage)} usados
                </span>
                <span
                    className={cn(
                        level === 'ok' && 'text-muted-foreground',
                        level === 'warn' && 'text-amber-500',
                        level === 'critical' && 'text-destructive font-medium',
                    )}
                >
                    {formatBytes(freeBytes(info))} livres
                </span>
            </div>
            <div
                role="progressbar"
                aria-label="Uso do armazenamento do navegador"
                aria-valuenow={Math.round(percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="bg-muted h-1.5 overflow-hidden rounded-full"
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-[width]',
                        level === 'ok' && 'bg-primary',
                        level === 'warn' && 'bg-amber-500',
                        level === 'critical' && 'bg-destructive-solid',
                    )}
                    style={{ width: `${Math.max(percent, 1)}%` }}
                />
            </div>
            {info.quota < LOW_QUOTA_BYTES && (
                <p className="text-amber-500">
                    Este navegador reservou pouco espaço ({formatBytes(info.quota)}). Faça backup
                    com frequência no perfil.
                </p>
            )}
            {level !== 'ok' && (
                <p className={level === 'critical' ? 'text-destructive' : 'text-amber-500'}>
                    {level === 'critical'
                        ? 'Quase sem espaço. Exclua fotos ou faça um backup no perfil.'
                        : 'O espaço está acabando. Considere fazer um backup no perfil.'}
                </p>
            )}
        </div>
    )
}
