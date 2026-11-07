// Painel de ajustes em abas com ícone: Luz, Cor, HSL, Grading, Curvas, Efeitos e Detalhe.
import {
    Blend,
    Crop,
    Droplets,
    Focus,
    Palette,
    RotateCcw,
    Sparkles,
    Spline,
    Sun,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CurveChannel, Point } from '@/editor/curves'
import { PARAM_GROUPS, TABS } from '@/editor/groups'
import type { Lut } from '@/editor/lut'
import type { EditParams, ParamKey } from '@/editor/params'
import { Hint } from '@/ui/hint'
import { CurveEditor } from './curve-editor'
import { GradingPanel } from './grading-panel'
import { HslPanel } from './hsl-panel'
import { LutControl } from './lut-control'
import { ParamSlider } from './param-slider'

const TAB_ICONS: Record<string, ReactNode> = {
    light: <Sun />,
    color: <Palette />,
    hsl: <Droplets />,
    grading: <Blend />,
    curves: <Spline />,
    effects: <Sparkles />,
    detail: <Focus />,
    crop: <Crop />,
}

type Props = {
    params: EditParams
    onChange: (key: ParamKey, value: number) => void
    onCurves: (channel: CurveChannel, points: Point[]) => void
    onCommit: () => void
    /** Confirmado no diálogo: volta tudo ao padrão. */
    onReset: () => void
    /** Muda quando params são trocados de fora (preset, redefinir): remonta só os controles. */
    resetKey: number
    /** Há algum ajuste diferente do padrão: habilita o "Redefinir tudo". */
    dirty: boolean
    /** A aba aberta tem algo fora do padrão: habilita "Redefinir só esta aba". */
    tabDirty: boolean
    onResetTab: () => void
    tab: string
    onTabChange: (tab: string) => void
    resetOpen: boolean
    onResetOpenChange: (open: boolean) => void
    lut: Lut | null
    onImportLut: (file: File) => Promise<void>
    onRemoveLut: () => void
    /** Histograma que fica no cabeçalho fixo do painel. */
    histogram?: ReactNode
    /** Conteúdo da aba Cortar (vem do editor, que guarda a geometria). */
    cropPanel?: ReactNode
}

export function AdjustPanel(props: Props) {
    const { params, onChange, onCurves, onCommit, onReset, resetKey, dirty, tab, onTabChange } =
        props
    const { resetOpen, onResetOpenChange, lut, onImportLut, onRemoveLut, histogram } = props
    const { tabDirty, onResetTab, cropPanel } = props

    const sliders = (id: string) =>
        PARAM_GROUPS.find((g) => g.id === id)?.keys.map((key) => (
            <ParamSlider
                key={`${key}-${resetKey}`}
                paramKey={key}
                initial={params[key]}
                onChange={onChange}
                onCommit={onCommit}
            />
        ))

    return (
        // Cabeçalho fixo (histograma e abas), corpo com scroll, rodapé fixo. Nada aqui se mexe:
        // só o miolo rola, qualquer que seja a altura do conteúdo da aba.
        <Card
            size="sm"
            className="min-h-0 flex-1 gap-0 border ring-0 overflow-hidden py-0 font-mono"
        >
            <Tabs
                value={tab}
                onValueChange={(v) => onTabChange(String(v))}
                className="min-h-0 flex-1 gap-0"
            >
                <div className="flex shrink-0 flex-col gap-3 border-b p-3">
                    {/* No topo e com título: deixa claro que vale para a foto toda, não só para a aba aberta. */}
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-heading text-lg font-semibold">Ajustes da foto</span>
                        <Hint label="Volta todos os ajustes de todas as abas ao padrão" wrap>
                            <Button
                                variant="outline"
                                size="xs"
                                disabled={!dirty}
                                onClick={() => onResetOpenChange(true)}
                            >
                                <RotateCcw data-icon="inline-start" />
                                Redefinir tudo
                            </Button>
                        </Hint>
                    </div>
                    {histogram && <div className="hidden md:block">{histogram}</div>}
                    <TabsList className="grid h-auto! w-full grid-cols-4 gap-1 p-1 max-sm:grid-cols-8">
                        {TABS.map((t, i) => (
                            <Hint key={t.id} label={`${t.label} (${i + 1})`}>
                                <TabsTrigger
                                    value={t.id}
                                    aria-label={t.label}
                                    className="h-auto flex-col gap-1 py-1.5 text-xs"
                                >
                                    {TAB_ICONS[t.id]}
                                    <span className="max-sm:sr-only">{t.label}</span>
                                </TabsTrigger>
                            </Hint>
                        ))}
                    </TabsList>
                </div>

                <ScrollArea key={tab} className="min-h-0 flex-1" viewportClassName="min-h-0 flex-1">
                    <div className="p-3">
                        {(['light', 'color', 'detail'] as const).map((id) => (
                            <TabsContent key={id} value={id} className="flex flex-col gap-5">
                                {sliders(id)}
                            </TabsContent>
                        ))}
                        <TabsContent value="effects" className="flex flex-col gap-5">
                            {sliders('effects')}
                            <LutControl
                                key={`lut-${resetKey}`}
                                lut={lut}
                                params={params}
                                onChange={onChange}
                                onCommit={onCommit}
                                onImport={onImportLut}
                                onRemove={onRemoveLut}
                            />
                        </TabsContent>
                        <TabsContent value="hsl">
                            <HslPanel
                                key={`hsl-${resetKey}`}
                                params={params}
                                onChange={onChange}
                                onCommit={onCommit}
                            />
                        </TabsContent>
                        <TabsContent value="grading">
                            <GradingPanel
                                key={`grade-${resetKey}`}
                                params={params}
                                onChange={onChange}
                                onCommit={onCommit}
                            />
                        </TabsContent>
                        <TabsContent value="crop">{cropPanel}</TabsContent>
                        <TabsContent value="curves">
                            <CurveEditor
                                key={`curves-${resetKey}`}
                                curves={params.curves}
                                onChange={onCurves}
                                onCommit={onCommit}
                            />
                        </TabsContent>
                    </div>
                </ScrollArea>

                <div className="shrink-0 border-t p-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={!tabDirty}
                        onClick={onResetTab}
                    >
                        <RotateCcw data-icon="inline-start" />
                        Redefinir só {TABS.find((t) => t.id === tab)?.label ?? 'esta aba'}
                    </Button>
                </div>
            </Tabs>

            <Dialog open={resetOpen} onOpenChange={onResetOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redefinir todos os ajustes?</DialogTitle>
                        <DialogDescription>
                            Todos os controles voltam ao valor padrão e o preset selecionado sai.
                            Corte e giro continuam como estão. Dá para desfazer com Ctrl+Z.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onResetOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onReset()
                                onResetOpenChange(false)
                            }}
                        >
                            Redefinir tudo
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}
