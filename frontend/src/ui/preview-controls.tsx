// Barra flutuante do preview: desfazer/refazer, zoom, divisor, estouro, tela cheia e atalhos.
import {
    Columns2,
    Ellipsis,
    FlipHorizontal2,
    Grid3x3,
    Keyboard,
    Maximize,
    Minimize,
    Minus,
    Redo2,
    RotateCw,
    TriangleAlert,
    Undo2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { GRID_KINDS, GRID_LABELS, type GridKind } from '@/editor/guides'
import { Hint } from '@/ui/hint'

type Props = {
    canUndo: boolean
    canRedo: boolean
    zoom: number
    splitOn: boolean
    clipOn: boolean
    fullscreen: boolean
    onUndo: () => void
    onRedo: () => void
    onZoomIn: () => void
    onZoomOut: () => void
    onFit: () => void
    onToggleSplit: () => void
    onToggleClip: () => void
    onToggleFullscreen: () => void
    onHelp: () => void
    grid: GridKind
    horizonOn: boolean
    onGrid: (kind: GridKind) => void
    onToggleHorizon: () => void
    onRotateSpiral: () => void
    onMirrorSpiral: () => void
}

// Desktop: barra que só aparece com o mouse (ou foco) sobre a foto. Celular: menu sempre visível.
export function PreviewControls(p: Props) {
    return (
        <>
            <MobileMenu {...p} />
            <DesktopBar {...p} />
        </>
    )
}

function MobileMenu(p: Props) {
    return (
        <div className="absolute top-2 left-2 md:hidden">
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            size="icon-sm"
                            variant="secondary"
                            aria-label="Controles da foto"
                            className="bg-background/80 backdrop-blur"
                        />
                    }
                >
                    <Ellipsis />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="bottom" align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuItem disabled={!p.canUndo} onClick={p.onUndo}>
                            <Undo2 />
                            Desfazer
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!p.canRedo} onClick={p.onRedo}>
                            <Redo2 />
                            Refazer
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuItem onClick={p.onZoomIn}>
                            <ZoomIn />
                            Aproximar
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={p.zoom <= 1} onClick={p.onZoomOut}>
                            <ZoomOut />
                            Afastar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={p.onFit}>
                            <Maximize />
                            Ajustar à tela ({Math.round(p.zoom * 100)}%)
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem checked={p.splitOn} onCheckedChange={p.onToggleSplit}>
                        <Columns2 />
                        Divisor antes e depois
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem checked={p.clipOn} onCheckedChange={p.onToggleClip}>
                        <TriangleAlert />
                        Aviso de estouro
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                        checked={p.horizonOn}
                        onCheckedChange={p.onToggleHorizon}
                    >
                        <Minus />
                        Linha do horizonte
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Grade</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                        value={p.grid}
                        onValueChange={(v) => p.onGrid(v as GridKind)}
                    >
                        {GRID_KINDS.map((k) => (
                            <DropdownMenuRadioItem key={k} value={k}>
                                {GRID_LABELS[k]}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                    {p.grid === 'golden' && (
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={p.onRotateSpiral}>
                                <RotateCw />
                                Girar espiral 180°
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={p.onMirrorSpiral}>
                                <FlipHorizontal2 />
                                Espelhar espiral
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={p.onToggleFullscreen}>
                        {p.fullscreen ? <Minimize /> : <Maximize />}
                        {p.fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}

function DesktopBar(p: Props) {
    return (
        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1 rounded-lg bg-background/80 p-1 opacity-0 backdrop-blur transition-opacity duration-150 group-hover/stage:opacity-100 group-has-[:focus-visible]/stage:opacity-100 group-hover/bottom:opacity-100 group-has-[:focus-visible]/bottom:opacity-100 has-[[aria-expanded=true]]:opacity-100 max-md:hidden">
            <Hint label="Desfazer (Ctrl+Z)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Desfazer"
                    disabled={!p.canUndo}
                    onClick={p.onUndo}
                >
                    <Undo2 />
                </Button>
            </Hint>
            <Hint label="Refazer (Ctrl+Shift+Z)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Refazer"
                    disabled={!p.canRedo}
                    onClick={p.onRedo}
                >
                    <Redo2 />
                </Button>
            </Hint>
            <span className="mx-1 h-4 w-px bg-border" />
            <Hint label="Diminuir zoom (-)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Diminuir zoom"
                    disabled={p.zoom <= 1}
                    onClick={p.onZoomOut}
                >
                    <ZoomOut />
                </Button>
            </Hint>
            <Hint label="Ajustar à tela (0)">
                <Button
                    size="xs"
                    variant="ghost"
                    aria-label="Ajustar à tela"
                    onClick={p.onFit}
                    className="min-w-12 tabular-nums"
                >
                    {Math.round(p.zoom * 100)}%
                </Button>
            </Hint>
            <Hint label="Aumentar zoom (+)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Aumentar zoom"
                    onClick={p.onZoomIn}
                >
                    <ZoomIn />
                </Button>
            </Hint>
            <span className="mx-1 h-4 w-px bg-border" />
            <Hint label="Divisor antes/depois (\)">
                <Button
                    size="icon-sm"
                    variant={p.splitOn ? 'secondary' : 'ghost'}
                    aria-pressed={p.splitOn}
                    aria-label="Divisor antes e depois"
                    onClick={p.onToggleSplit}
                >
                    <Columns2 />
                </Button>
            </Hint>
            <DropdownMenu>
                <Tooltip>
                    <DropdownMenuTrigger
                        render={
                            <TooltipTrigger
                                render={
                                    <Button
                                        size="icon-sm"
                                        variant={
                                            p.grid !== 'off' || p.horizonOn ? 'secondary' : 'ghost'
                                        }
                                        aria-label="Grades de composição"
                                    />
                                }
                            />
                        }
                    >
                        <Grid3x3 />
                    </DropdownMenuTrigger>
                    <TooltipContent>Grades de composição (G)</TooltipContent>
                </Tooltip>
                <DropdownMenuContent side="top" align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Grade (G)</DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                        value={p.grid}
                        onValueChange={(v) => p.onGrid(v as GridKind)}
                    >
                        {GRID_KINDS.map((k) => (
                            <DropdownMenuRadioItem key={k} value={k}>
                                {GRID_LABELS[k]}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                    {p.grid === 'golden' && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                <DropdownMenuItem onClick={p.onRotateSpiral}>
                                    <RotateCw />
                                    Girar espiral 180° (O)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={p.onMirrorSpiral}>
                                    <FlipHorizontal2 />
                                    Espelhar espiral (Shift+O)
                                </DropdownMenuItem>
                            </DropdownMenuGroup>
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        checked={p.horizonOn}
                        onCheckedChange={p.onToggleHorizon}
                    >
                        <Minus />
                        Linha do horizonte (H)
                    </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Hint label="Aviso de estouro (J)">
                <Button
                    size="icon-sm"
                    variant={p.clipOn ? 'secondary' : 'ghost'}
                    aria-pressed={p.clipOn}
                    aria-label="Aviso de estouro"
                    onClick={p.onToggleClip}
                >
                    <TriangleAlert />
                </Button>
            </Hint>
            <Hint label="Tela cheia (F)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={p.fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
                    onClick={p.onToggleFullscreen}
                >
                    {p.fullscreen ? <Minimize /> : <Maximize />}
                </Button>
            </Hint>
            <Hint label="Atalhos (?)">
                <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Atalhos de teclado"
                    onClick={p.onHelp}
                >
                    <Keyboard />
                </Button>
            </Hint>
        </div>
    )
}
