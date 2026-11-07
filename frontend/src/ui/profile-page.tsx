// Tela /perfil: conta (login), armazenamento do navegador, backup/restauração e aparência.
import { useQueryClient } from '@tanstack/react-query'
import {
    Archive,
    HardDrive,
    LogIn,
    LogOut,
    Moon,
    Palette,
    ShieldCheck,
    Sun,
    UserRound,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { signInWithGoogle, signOut } from '@/auth/auth-store'
import { useSession } from '@/auth/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { persister } from '@/lib/query-persist'
import {
    formatBytes,
    freeBytes,
    LOW_QUOTA_BYTES,
    requestPersistence,
    useStorageInfo,
} from '@/lib/storage'
import { useTheme } from '@/lib/theme'
import { createBackup, restoreBackup } from '@/photos/backup'
import { Enter } from '@/ui/enter'

const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

const errorMessage = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback)

function AccountCard() {
    const session = useSession()
    const qc = useQueryClient()
    const name =
        (session?.user.user_metadata?.full_name as string | undefined) ?? session?.user.email
    const avatar = session?.user.user_metadata?.avatar_url as string | undefined

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserRound className="size-4" />
                    Conta
                </CardTitle>
                <CardDescription>
                    {session
                        ? 'Seus presets pessoais ficam salvos na sua conta.'
                        : 'Entre para salvar presets pessoais. As fotos continuam só neste navegador.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
                {session ? (
                    <>
                        <div className="flex min-w-0 items-center gap-3">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="size-10 rounded-full"
                                />
                            ) : (
                                <span className="bg-muted flex size-10 items-center justify-center rounded-full">
                                    {(name ?? '?').charAt(0).toUpperCase()}
                                </span>
                            )}
                            <div className="min-w-0">
                                <p className="truncate font-medium">{name}</p>
                                <p className="text-muted-foreground truncate text-sm">
                                    {session.user.email}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                try {
                                    await signOut()
                                    qc.removeQueries({ queryKey: ['presets', 'user'] })
                                    await persister.removeClient()
                                } catch (e) {
                                    toast.error(errorMessage(e, 'Não foi possível sair'))
                                }
                            }}
                        >
                            <LogOut data-icon="inline-start" />
                            Sair
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={() =>
                            signInWithGoogle().catch((e: Error) => toast.error(e.message))
                        }
                    >
                        <LogIn data-icon="inline-start" />
                        Entrar com Google
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

function StorageCard() {
    const { info, refresh } = useStorageInfo()
    const percent = info && info.quota > 0 ? Math.min(100, (info.usage / info.quota) * 100) : 0

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDrive className="size-4" />
                    Armazenamento
                </CardTitle>
                <CardDescription>
                    Onde ficam suas fotos: o IndexedDB deste navegador.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                {info?.supported ? (
                    <>
                        <div
                            role="progressbar"
                            aria-label="Uso do armazenamento"
                            aria-valuenow={Math.round(percent)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="bg-muted h-2 overflow-hidden rounded-full"
                        >
                            <div
                                className="bg-primary h-full rounded-full"
                                style={{ width: `${Math.max(percent, 0.5)}%` }}
                            />
                        </div>
                        <p className="text-muted-foreground text-sm tabular-nums">
                            {formatBytes(info.usage)} de {formatBytes(info.quota)} (
                            {percent.toFixed(1)}%), {formatBytes(freeBytes(info))} livres
                        </p>
                        {info.quota < LOW_QUOTA_BYTES && (
                            <p className="text-sm text-amber-500">
                                Este navegador reservou pouco espaço. Faça backup com frequência.
                            </p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-1.5 text-sm">
                                <ShieldCheck className="size-4" />
                                {info.persisted
                                    ? 'Protegido contra limpeza automática'
                                    : 'Pode ser limpo pelo navegador se faltar espaço'}
                            </p>
                            {!info.persisted && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        const ok = await requestPersistence()
                                        toast[ok ? 'success' : 'info'](
                                            ok
                                                ? 'Armazenamento protegido'
                                                : 'O navegador não concedeu agora. Ele costuma aceitar depois que você usa o site mais vezes, o adiciona aos favoritos ou o instala como app.',
                                        )
                                        refresh()
                                    }}
                                >
                                    Proteger dados
                                </Button>
                            )}
                        </div>
                    </>
                ) : (
                    <p className="text-muted-foreground text-sm">
                        Este navegador não informa o uso de armazenamento.
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

function BackupCard() {
    const qc = useQueryClient()
    const inputRef = useRef<HTMLInputElement>(null)
    const [busy, setBusy] = useState<'export' | 'restore' | null>(null)

    const onExport = async () => {
        setBusy('export')
        try {
            const { blob, count } = await createBackup()
            download(blob, `open-filter-backup-${new Date().toISOString().slice(0, 10)}.zip`)
            toast.success(`Backup com ${count} ${count === 1 ? 'foto' : 'fotos'}`)
        } catch (e) {
            toast.error(errorMessage(e, 'Não foi possível exportar'))
        } finally {
            setBusy(null)
        }
    }

    const onRestore = async (file: File) => {
        setBusy('restore')
        try {
            const count = await restoreBackup(file)
            await qc.invalidateQueries({ queryKey: ['photos'] })
            toast.success(
                count > 0
                    ? `${count} ${count === 1 ? 'foto restaurada' : 'fotos restauradas'}`
                    : 'Nenhuma foto encontrada no backup',
            )
        } catch (e) {
            toast.error(errorMessage(e, 'Não foi possível restaurar'))
        } finally {
            setBusy(null)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Archive className="size-4" />
                    Backup das fotos
                </CardTitle>
                <CardDescription>
                    Limpar os dados do navegador apaga suas fotos. O backup é um .zip com as
                    originais e os ajustes de cada uma.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button onClick={onExport} disabled={busy !== null}>
                    {busy === 'export' ? 'Exportando...' : 'Exportar backup'}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy !== null}
                >
                    {busy === 'restore' ? 'Restaurando...' : 'Restaurar backup'}
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".zip,application/zip"
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ''
                        if (file) void onRestore(file)
                    }}
                />
            </CardContent>
        </Card>
    )
}

function AppearanceCard() {
    const { theme, setTheme } = useTheme()
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Palette className="size-4" />
                    Aparência
                </CardTitle>
                <CardDescription>
                    O tema vale para todas as telas e fica salvo aqui.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    aria-pressed={theme === 'light'}
                    onClick={() => setTheme('light')}
                >
                    <Sun data-icon="inline-start" />
                    Claro
                </Button>
                <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    aria-pressed={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                >
                    <Moon data-icon="inline-start" />
                    Escuro
                </Button>
            </CardContent>
        </Card>
    )
}

export function ProfilePage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6 lg:py-10">
                <Enter className="mb-2 flex flex-col gap-1">
                    <h1 className="font-heading text-4xl font-semibold tracking-tight">Perfil</h1>
                    <p className="text-muted-foreground text-sm">
                        Conta, espaço usado pelas fotos, backup e aparência.
                    </p>
                </Enter>
                <Enter i={1}>
                    <AccountCard />
                </Enter>
                <Enter i={2}>
                    <StorageCard />
                </Enter>
                <Enter i={3}>
                    <BackupCard />
                </Enter>
                <Enter i={4}>
                    <AppearanceCard />
                </Enter>
            </div>
        </div>
    )
}
