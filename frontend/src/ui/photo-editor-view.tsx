// Editor: carrega a foto e liga canvas, sliders, presets, histórico, histograma, zoom, divisor e atalhos.

import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Download, Eye, Save, Wand2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useSession } from '@/auth/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type CurveChannel, curvesAreIdentity, identityCurves, type Point } from '@/editor/curves'
import { type AspectId, frameSize, type Geometry } from '@/editor/geometry'
import { TABS, type TabId, tabParamKeys } from '@/editor/groups'
import { type GridKind, nextGrid } from '@/editor/guides'
import { createHistogramController, type HistogramController } from '@/editor/histogram'
import { createHistory, type History } from '@/editor/history'
import { type Lut, parseCube } from '@/editor/lut'
import {
    blendParams,
    defaultParams,
    type EditParams,
    isDefaultParams,
    PARAM_DEFS,
    type ParamKey,
    paramsEqual,
    paramsSchema,
} from '@/editor/params'
import { type CanvasHandle, PhotoCanvas, type ViewRect } from '@/editor/photo-canvas'
import { PortalContainerProvider } from '@/lib/portal-container'
import { deletePhoto, touchPhoto, updatePhotoParams } from '@/photos/db'
import { decodePhoto } from '@/photos/decode'
import { usePhoto } from '@/photos/queries'
import { sniffImageType } from '@/photos/validate'
import type { Preset } from '@/presets/api'
import { usePublicPresets, useUserPresets } from '@/presets/queries'
import { usePresetThumbnails } from '@/presets/use-preset-thumbnails'
import { Hint } from '@/ui/hint'
import { AdjustPanel } from './adjust-panel'
import { CompositionGuides } from './composition-guides'
import { CropOverlay } from './crop-overlay'
import { CropPanel } from './crop-panel'
import { DeletePresetDialog } from './delete-preset-dialog'
import { EditorSkeleton, SKELETON_MIN_MS } from './editor-skeleton'
import { ExportDialog } from './export-dialog'
import { Histogram } from './histogram'
import { PhotoUnavailable } from './photo-unavailable'
import { PresetStrip } from './preset-strip'
import { PreviewControls } from './preview-controls'
import { SavePresetDialog } from './save-preset-dialog'
import { ShortcutsDialog } from './shortcuts-dialog'
import { SplitDivider } from './split-divider'
import { useShortcuts } from './use-shortcuts'

/** Abas com algo fora do padrão (ids separados por vírgula): string, para o setState não re-renderizar à toa. */
const dirtyTabsOf = (params: EditParams) =>
    TABS.filter((t) =>
        t.id === 'curves'
            ? !curvesAreIdentity(params.curves)
            : tabParamKeys(t.id).some((k) => params[k] !== PARAM_DEFS[k].default),
    )
        .map((t) => t.id)
        .join(',')

// Diálogos são portalizados no body e ficam invisíveis em tela cheia: sai antes de abrir um.
const exitFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
}

export function PhotoEditorView({ photoId }: { photoId: string }) {
    const { data: photo, isError, error } = usePhoto(photoId)
    const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
    // O skeleton aparece já no primeiro quadro (nunca uma tela vazia) e fica o tempo mínimo para não piscar.
    const [skeletonDone, setSkeletonDone] = useState(false)
    useEffect(() => {
        const t = setTimeout(() => setSkeletonDone(true), SKELETON_MIN_MS)
        return () => clearTimeout(t)
    }, [])
    // Params ficam em objeto mutável: o slider escreve aqui e o canvas lê, sem re-render da árvore.
    const paramsRef = useRef<EditParams>(defaultParams())
    const canvasRef = useRef<CanvasHandle>(null)
    const stageRef = useRef<HTMLDivElement>(null)
    const historyRef = useRef<History | null>(null)
    const histogramRef = useRef<HistogramController | null>(null)
    const lutRef = useRef<Lut | null>(null)

    // useState só para o que a UI mostra.
    const [histogram, setHistogram] = useState<HistogramController | null>(null)
    const [comparing, setComparing] = useState(false)
    const [resetKey, setResetKey] = useState(0)
    const [exportOpen, setExportOpen] = useState(false)
    const [resetOpen, setResetOpen] = useState(false)
    const [helpOpen, setHelpOpen] = useState(false)
    const [tab, setTab] = useState<string>(TABS[0].id)
    const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
    const [deletingPreset, setDeletingPreset] = useState<Preset | null>(null)
    // Filtro pessoal em edição: sobrevive aos ajustes manuais (selectedPresetId some ao mexer num slider).
    const [basePresetId, setBasePresetId] = useState<string | null>(null)
    // Intensidade do preset selecionado (0 a 1): mistura entre os params padrão e os do preset.
    const [intensity, setIntensity] = useState(1)
    const [dirty, setDirty] = useState(false)
    const [dirtyTabs, setDirtyTabs] = useState('')
    const [canUndo, setCanUndo] = useState(false)
    const [canRedo, setCanRedo] = useState(false)
    const [zoom, setZoom] = useState(1)
    const [rect, setRect] = useState<ViewRect | null>(null)
    // Enquadramento (corte, giro, espelho): vive na foto e não entra em preset.
    const [geometry, setGeometry] = useState<Geometry>(() => paramsRef.current.geometry)
    const [frameRect, setFrameRect] = useState<ViewRect | null>(null)
    const [aspect, setAspect] = useState<AspectId>('free')
    // Grades e horizonte são só de referência no preview: não entram na exportação nem na foto salva.
    const [grid, setGrid] = useState<GridKind>('off')
    const [horizon, setHorizon] = useState(false)
    const [horizonY, setHorizonY] = useState(0.5)
    // Orientação da espiral áurea: bit 0 = espelhada, bit 1 = girada 180° (só 4 orientações combinam com a foto).
    const [spiralTurn, setSpiralTurn] = useState(0)
    const [lockedRatio, setLockedRatio] = useState<number | null>(null)
    // Divisor ligado e posição são estados separados: arrastar até 0 não pode desligar o divisor.
    const [splitOn, setSplitOn] = useState(false)
    const [split, setSplit] = useState(0.5)
    const [clipOn, setClipOn] = useState(false)
    const [fullscreen, setFullscreen] = useState(false)
    // LUT 3D importado: vale só nesta sessão (não entra em presets nem é salvo).
    const [lut, setLut] = useState<Lut | null>(null)

    const [scope, setScope] = useState<'public' | 'mine'>('public')
    const [saveOpen, setSaveOpen] = useState(false)
    const session = useSession()
    const qc = useQueryClient()
    const navigate = useNavigate()
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const photoRef = useRef(photo)
    photoRef.current = photo

    const publicPresets = usePublicPresets()
    const userPresets = useUserPresets(session?.user.id)
    // Visitante não tem "Meus": volta para os oficiais ao sair da conta.
    const activeScope = session ? scope : 'public'
    const presets = activeScope === 'mine' ? userPresets : publicPresets
    // Miniaturas de todos de uma vez: trocar de aba não refaz o trabalho.
    const allPresets = useMemo(
        () => [...(publicPresets.data ?? []), ...(userPresets.data ?? [])],
        [publicPresets.data, userPresets.data],
    )
    const thumbs = usePresetThumbnails(photo?.thumbnailBlob, allPresets)

    const loadedId = photo?.id
    // biome-ignore lint/correctness/useExhaustiveDependencies: depende só do id; o objeto `photo` muda a cada salvamento automático
    useEffect(() => {
        const photo = photoRef.current
        if (!photo || photo.id !== loadedId) return
        // parse preenche o que faltar em fotos salvas antes de existirem curvas, geometria e novos ajustes.
        paramsRef.current = paramsSchema.parse(photo.params)
        setGeometry(paramsRef.current.geometry)
        historyRef.current = createHistory(photo.params)
        setCanUndo(false)
        setCanRedo(false)
        setDirty(!isDefaultParams(photo.params))
        setDirtyTabs(dirtyTabsOf(photo.params))
        // Abrir a foto também a torna a mais recente no Estúdio ("Continuar de onde parou").
        touchPhoto(photo.id)
            .then(() => qc.invalidateQueries({ queryKey: ['photos'], exact: true }))
            .catch(() => undefined)
        let cancelled = false
        let decoded: ImageBitmap | null = null
        decodePhoto(photo.originalBlob)
            .then(({ preview }) => {
                if (cancelled) return preview.close()
                decoded = preview
                setBitmap(preview)
            })
            .catch(async () => {
                if (cancelled) return
                // Só apaga o que comprovadamente não é imagem: falha de memória em foto válida não pode custar a foto.
                if (await sniffImageType(photo.originalBlob)) {
                    toast.error(
                        'Não foi possível abrir esta foto. Tente de novo ou feche outras abas.',
                    )
                    return
                }
                await deletePhoto(photo.id)
                await qc.invalidateQueries({ queryKey: ['photos'] })
                toast.warning('Este arquivo não era uma imagem e foi removido do álbum')
                void navigate({ to: '/app' })
            })
        return () => {
            cancelled = true
            decoded?.close()
        }
    }, [loadedId])

    // Ao reabrir a foto, o preset aplicado não é salvo: reconhece pelo par de params idêntico
    // e volta a marcá-lo (a lista rola até ele). Só tenta uma vez por foto, com as listas carregadas.
    const restoredFor = useRef<string | null>(null)
    const listsReady = !publicPresets.isPending && (!session || !userPresets.isPending)
    useEffect(() => {
        if (!loadedId || !listsReady || restoredFor.current === loadedId) return
        restoredFor.current = loadedId
        const current = paramsRef.current
        if (isDefaultParams(current)) return
        const match = allPresets.find((p) =>
            paramsEqual({ ...p.params, geometry: current.geometry }, current),
        )
        if (!match) return
        setSelectedPresetId(match.id)
        if (userPresets.data?.some((p) => p.id === match.id)) {
            setScope('mine')
            setBasePresetId(match.id)
        }
    }, [loadedId, listsReady, allPresets, userPresets.data])

    // Histograma: um mini render com o mesmo shader, vivo enquanto houver bitmap.
    useEffect(() => {
        if (!bitmap) return
        const controller = createHistogramController(bitmap, paramsRef.current, lutRef.current)
        histogramRef.current = controller
        setHistogram(controller)
        return () => {
            controller.dispose()
            histogramRef.current = null
            setHistogram(null)
        }
    }, [bitmap])

    // A aba Cortar mostra o quadro inteiro para editar a caixa; fora dela, só a área cortada.
    useEffect(() => {
        canvasRef.current?.setCropMode(tab === 'crop')
    }, [tab])

    useEffect(() => {
        const onChange = () => setFullscreen(document.fullscreenElement === stageRef.current)
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    // Grava os ajustes no IndexedDB 500ms depois do último movimento (não a cada passo do slider).
    const saveNow = () => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = null
        const id = photoRef.current?.id
        if (!id) return
        updatePhotoParams(id, paramsRef.current)
            .then(() => qc.invalidateQueries({ queryKey: ['photos'], exact: true }))
            .catch(() => toast.error('Não foi possível salvar os ajustes desta foto'))
    }
    const scheduleSave = () => {
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(saveNow, 500)
    }
    const saveNowRef = useRef(saveNow)
    saveNowRef.current = saveNow

    // Não perde o último ajuste ao sair da tela ou esconder a aba.
    useEffect(() => {
        const onHide = () =>
            document.visibilityState === 'hidden' && saveTimer.current && saveNowRef.current()
        document.addEventListener('visibilitychange', onHide)
        return () => {
            document.removeEventListener('visibilitychange', onHide)
            if (saveTimer.current) saveNowRef.current()
        }
    }, [])

    const pushParams = () => {
        scheduleSave()
        canvasRef.current?.setParams(paramsRef.current)
        histogramRef.current?.update(paramsRef.current)
        setDirty(!isDefaultParams(paramsRef.current))
        setDirtyTabs(dirtyTabsOf(paramsRef.current))
    }

    const syncHistory = () => {
        setCanUndo(historyRef.current?.canUndo() ?? false)
        setCanRedo(historyRef.current?.canRedo() ?? false)
    }

    /** Fim de um gesto: vira um ponto do desfazer/refazer. */
    const commit = () => {
        if (historyRef.current?.record(paramsRef.current)) syncHistory()
    }

    const onChange = (key: ParamKey, value: number) => {
        paramsRef.current[key] = value
        pushParams()
        // Ajuste manual deixa de ser "o preset"; o setState com o mesmo valor não re-renderiza.
        setSelectedPresetId(null)
    }

    // Troca todos os params de fora (preset, redefinir, desfazer) e remonta só os sliders.
    const applyParams = (params: EditParams) => {
        paramsRef.current = { ...params }
        pushParams()
        canvasRef.current?.setGeometry(paramsRef.current.geometry)
        setGeometry(paramsRef.current.geometry)
        setResetKey((k) => k + 1)
    }

    /** Enquadramento mudou: só a geometria (não mexe em dirty nem em presets). */
    const onGeometry = (next: Geometry) => {
        paramsRef.current = { ...paramsRef.current, geometry: next }
        canvasRef.current?.setGeometry(next)
        setGeometry(next)
        scheduleSave()
    }

    const onCurves = (channel: CurveChannel, points: Point[]) => {
        // Curvas são imutáveis (o shader só refaz a LUT quando o objeto muda): sempre um objeto novo.
        paramsRef.current = {
            ...paramsRef.current,
            curves: { ...paramsRef.current.curves, [channel]: points },
        }
        pushParams()
        setSelectedPresetId(null)
    }

    const applyLut = (next: Lut | null) => {
        lutRef.current = next
        setLut(next)
        canvasRef.current?.setLut(next)
        histogramRef.current?.setLut(next)
    }

    const importLut = async (file: File) => {
        applyLut(parseCube(await file.text(), file.name.replace(/\.cube$/i, '')))
        toast.success('LUT carregado')
    }

    // Volta ao padrão só os controles da aba aberta (o resto e o enquadramento ficam como estão).
    const resetTab = () => {
        const id = tab as TabId
        const next: EditParams = { ...paramsRef.current }
        for (const key of tabParamKeys(id)) next[key] = PARAM_DEFS[key].default
        if (id === 'curves') next.curves = identityCurves()
        applyParams(next)
        setSelectedPresetId(null)
        commit()
    }

    const onReset = () => {
        // "Redefinir tudo" é dos ajustes de cor e efeitos: o enquadramento fica como está.
        applyParams({ ...defaultParams(), geometry: paramsRef.current.geometry })
        setSelectedPresetId(null)
        setBasePresetId(null)
        commit()
    }

    const selectedPreset = allPresets.find((p) => p.id === selectedPresetId) ?? null
    // Some se o filtro foi excluído no meio da edição.
    const basePreset = userPresets.data?.find((p) => p.id === basePresetId) ?? null

    const onSelectPreset = (preset: Preset) => {
        setIntensity(1)
        applyParams({ ...preset.params, geometry: paramsRef.current.geometry })
        setSelectedPresetId(preset.id)
        setBasePresetId(userPresets.data?.some((p) => p.id === preset.id) ? preset.id : null)
        commit()
    }

    const onIntensity = (value: number) => {
        setIntensity(value)
        if (!selectedPreset) return
        const keep = paramsRef.current.geometry
        applyParams(
            blendParams(
                { ...defaultParams(), geometry: keep },
                { ...selectedPreset.params, geometry: keep },
                value,
            ),
        )
    }

    const undo = () => {
        const snapshot = historyRef.current?.undo()
        if (!snapshot) return
        applyParams(snapshot)
        setSelectedPresetId(null)
        syncHistory()
    }

    const redo = () => {
        const snapshot = historyRef.current?.redo()
        if (!snapshot) return
        applyParams(snapshot)
        setSelectedPresetId(null)
        syncHistory()
    }

    const compare = (on: boolean) => {
        setComparing(on)
        canvasRef.current?.setCompare(on)
    }

    const changeSplit = (fraction: number) => {
        setSplit(fraction)
        canvasRef.current?.setSplit(fraction)
    }

    const toggleSplit = () => {
        const next = !splitOn
        setSplitOn(next)
        // Desligado: uSplit = 0 mostra tudo editado. Ligado: usa a posição atual.
        canvasRef.current?.setSplit(next ? split : 0)
    }

    const toggleClip = () => {
        const next = !clipOn
        setClipOn(next)
        canvasRef.current?.setShowClip(next)
    }

    const toggleFullscreen = () => {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void stageRef.current?.requestFullscreen()
    }

    const openExport = () => {
        exitFullscreen()
        setExportOpen(true)
    }

    useShortcuts({
        toggleSplit,
        holdCompare: compare,
        toggleFullscreen,
        toggleClip,
        reset: () => {
            if (!dirty) return
            exitFullscreen()
            setResetOpen(true)
        },
        undo,
        redo,
        selectTab: (i) => setTab(TABS[i]?.id ?? tab),
        exportPhoto: openExport,
        showHelp: () => {
            exitFullscreen()
            setHelpOpen(true)
        },
        zoomIn: () => canvasRef.current?.zoomBy(1.4),
        zoomOut: () => canvasRef.current?.zoomBy(1 / 1.4),
        fit: () => canvasRef.current?.resetView(),
        cycleGrid: () => setGrid(nextGrid),
        toggleHorizon: () => setHorizon((h) => !h),
        rotateSpiral: () => setSpiralTurn((t) => t ^ 2),
        mirrorSpiral: () => setSpiralTurn((t) => t ^ 1),
    })

    if (isError) return <PhotoUnavailable error={error} />
    if (!bitmap || !skeletonDone) return <EditorSkeleton />

    // O mesmo painel serve ao aside e à tela cheia (onde ele fica sobre a lateral do palco).
    const adjustPanel = (
        <AdjustPanel
            histogram={<Histogram controller={histogram} />}
            cropPanel={
                photo && (
                    <CropPanel
                        geometry={geometry}
                        photoSize={{ w: photo.width, h: photo.height }}
                        aspect={aspect}
                        onAspect={(id, ratio) => {
                            setAspect(id)
                            setLockedRatio(ratio)
                        }}
                        onChange={onGeometry}
                        onCommit={commit}
                    />
                )
            }
            params={paramsRef.current}
            onChange={onChange}
            onCurves={onCurves}
            onCommit={commit}
            onReset={onReset}
            resetKey={resetKey}
            dirty={dirty}
            tabDirty={dirtyTabs.split(',').includes(tab)}
            onResetTab={resetTab}
            tab={tab}
            onTabChange={setTab}
            resetOpen={resetOpen}
            onResetOpenChange={(open) => {
                if (open) exitFullscreen()
                setResetOpen(open)
            }}
            lut={lut}
            onImportLut={importLut}
            onRemoveLut={() => applyLut(null)}
        />
    )

    return (
        <div className="flex flex-col gap-3 max-md:overflow-y-auto md:h-full md:min-h-0 md:flex-row">
            <PortalContainerProvider value={fullscreen ? stageRef.current : null}>
                <div
                    ref={stageRef}
                    className={`${fullscreen ? '' : 'group/stage '}bg-card relative order-1 h-[58dvh] shrink-0 overflow-hidden rounded-xl border select-none md:order-2 md:h-auto md:min-h-0 md:min-w-0 md:flex-1`}
                >
                    <PhotoCanvas
                        ref={canvasRef}
                        bitmap={bitmap}
                        initialParams={paramsRef.current}
                        initialLut={lutRef.current}
                        initialGeometry={paramsRef.current.geometry}
                        className="absolute inset-0"
                        onViewChange={(v) => {
                            setZoom(v.zoom)
                            setRect(v.rect)
                            setFrameRect(v.frame)
                        }}
                    />
                    {tab === 'crop' && frameRect && photo && (
                        <CropOverlay
                            frame={frameRect}
                            frameSize={frameSize(photo.width, photo.height, geometry)}
                            crop={geometry.crop}
                            ratio={lockedRatio}
                            onChange={(crop) => onGeometry({ ...geometry, crop })}
                            onCommit={commit}
                        />
                    )}
                    {tab !== 'crop' && rect && (grid !== 'off' || horizon) && (
                        <CompositionGuides
                            rect={rect}
                            grid={grid}
                            horizon={horizon}
                            horizonY={horizonY}
                            onHorizonY={setHorizonY}
                            spiralTurn={spiralTurn}
                        />
                    )}
                    {tab !== 'crop' && splitOn && rect && (
                        <SplitDivider rect={rect} split={split} onSplit={changeSplit} />
                    )}
                    {fullscreen && (
                        // Zona de hover na borda direita: Exportar e ajustes só aparecem com o mouse ali.
                        <div className="group/panel absolute inset-y-0 right-0 z-20 w-84 p-3">
                            <div className="flex h-full flex-col opacity-0 transition-opacity duration-150 group-hover/panel:opacity-100 group-has-[:focus-visible]/panel:opacity-100 has-[[aria-expanded=true]]:opacity-100">
                                <Button size="sm" onClick={openExport} className="mb-3 shrink-0">
                                    <Download data-icon="inline-start" />
                                    Exportar
                                </Button>
                                {adjustPanel}
                            </div>
                        </div>
                    )}
                    {!fullscreen && (
                        <Button
                            size="sm"
                            onClick={openExport}
                            className="absolute top-2 right-2 transition-opacity duration-150 md:opacity-0 md:group-hover/stage:opacity-100 md:group-has-[:focus-visible]/stage:opacity-100"
                        >
                            <Download data-icon="inline-start" />
                            Exportar
                        </Button>
                    )}
                    {/* Tela cheia: zona de hover na base. Fora dela os controles somem. */}
                    <div
                        className={
                            fullscreen
                                ? 'contents md:group/bottom md:absolute md:inset-x-0 md:bottom-0 md:z-10 md:block md:h-28'
                                : 'contents'
                        }
                    >
                        <PreviewControls
                            canUndo={canUndo}
                            canRedo={canRedo}
                            zoom={zoom}
                            splitOn={splitOn}
                            clipOn={clipOn}
                            fullscreen={fullscreen}
                            onUndo={undo}
                            onRedo={redo}
                            onZoomIn={() => canvasRef.current?.zoomBy(1.4)}
                            onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.4)}
                            onFit={() => canvasRef.current?.resetView()}
                            onToggleSplit={toggleSplit}
                            onToggleClip={toggleClip}
                            onToggleFullscreen={toggleFullscreen}
                            grid={grid}
                            horizonOn={horizon}
                            onGrid={setGrid}
                            onToggleHorizon={() => setHorizon((h) => !h)}
                            onRotateSpiral={() => setSpiralTurn((t) => t ^ 2)}
                            onMirrorSpiral={() => setSpiralTurn((t) => t ^ 1)}
                            onHelp={() => {
                                exitFullscreen()
                                setHelpOpen(true)
                            }}
                        />
                        <Hint label="Segure para ver a original (C)">
                            <Button
                                variant={comparing ? 'default' : 'secondary'}
                                size="sm"
                                aria-label="Comparar com original"
                                className={`absolute bottom-2 touch-none select-none transition-opacity duration-150 md:opacity-0 md:group-hover/stage:opacity-100 md:group-has-[:focus-visible]/stage:opacity-100 md:group-hover/bottom:opacity-100 md:group-has-[:focus-visible]/bottom:opacity-100 ${comparing ? 'md:opacity-100' : ''} ${fullscreen ? 'right-86' : 'right-2'}`}
                                onPointerDown={() => compare(true)}
                                onPointerUp={() => compare(false)}
                                onPointerLeave={() => comparing && compare(false)}
                                onPointerCancel={() => compare(false)}
                                onKeyDown={(e) =>
                                    (e.key === ' ' || e.key === 'Enter') &&
                                    !e.repeat &&
                                    compare(true)
                                }
                                onKeyUp={(e) =>
                                    (e.key === ' ' || e.key === 'Enter') && compare(false)
                                }
                            >
                                <Eye data-icon="inline-start" className="sm:hidden" />
                                <span className="max-sm:sr-only">Comparar com original</span>
                            </Button>
                        </Hint>
                    </div>
                </div>
            </PortalContainerProvider>

            <Card
                size="sm"
                className="order-2 shrink-0 border ring-0 md:order-1 md:h-full md:min-h-0 md:w-72"
            >
                <CardHeader>
                    <CardTitle className="flex items-center gap-1.5">
                        <Wand2 className="size-4" />
                        Presets
                    </CardTitle>
                    <CardAction className="flex items-center gap-2 md:col-span-2 md:col-start-1 md:row-span-1 md:row-start-2 md:mt-1 md:w-full md:min-w-0 md:justify-between md:justify-self-stretch">
                        <Tabs
                            value={activeScope}
                            onValueChange={(v) => setScope(v === 'mine' ? 'mine' : 'public')}
                        >
                            <TabsList>
                                <TabsTrigger value="public">Oficiais</TabsTrigger>
                                <Hint label={session ? null : 'Entre para ver seus presets'} wrap>
                                    <TabsTrigger value="mine" disabled={!session}>
                                        Meus
                                    </TabsTrigger>
                                </Hint>
                            </TabsList>
                        </Tabs>
                        <Hint
                            label={
                                dirty
                                    ? 'Salvar os ajustes atuais como preset'
                                    : 'Faça um ajuste para salvar'
                            }
                            wrap
                        >
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={!dirty}
                                aria-label="Salvar como preset"
                                onClick={() => {
                                    exitFullscreen()
                                    setSaveOpen(true)
                                }}
                            >
                                <Save data-icon="inline-start" />
                                <span className="hidden sm:max-md:inline">Salvar como preset</span>
                                <span className="hidden md:inline">Salvar</span>
                            </Button>
                        </Hint>
                    </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:min-h-0 md:flex-1">
                    <PresetStrip
                        presets={presets.data}
                        thumbs={thumbs}
                        selectedId={selectedPresetId}
                        loading={presets.isPending}
                        error={presets.isError}
                        emptyText="Você ainda não salvou presets. Ajuste a foto e use Salvar como preset."
                        onSelect={onSelectPreset}
                        // Só os presets pessoais podem ser excluídos; os oficiais não.
                        onDelete={activeScope === 'mine' ? setDeletingPreset : undefined}
                        belowFilters={
                            selectedPreset && (
                                <div className="flex flex-col gap-1.5">
                                    <p className="truncate text-sm" aria-live="polite">
                                        <span className="text-muted-foreground">
                                            Filtro aplicado:{' '}
                                        </span>
                                        <span className="font-medium">{selectedPreset.name}</span>
                                        {selectedPreset.category && (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                · {selectedPreset.category}
                                            </span>
                                        )}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <span className="w-24 shrink-0 text-sm">Intensidade</span>
                                        <Slider
                                            aria-label="Intensidade do preset"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            largeStep={0.1}
                                            value={[intensity]}
                                            onValueChange={(v) =>
                                                onIntensity(
                                                    Array.isArray(v) ? (v[0] ?? 1) : (v as number),
                                                )
                                            }
                                            onValueCommitted={commit}
                                        />
                                        <span className="text-muted-foreground w-10 shrink-0 text-right text-sm tabular-nums">
                                            {Math.round(intensity * 100)}%
                                        </span>
                                    </div>
                                </div>
                            )
                        }
                    />
                </CardContent>
            </Card>

            <aside className="order-3 flex h-[42dvh] shrink-0 flex-col gap-3 md:h-full md:w-80">
                {!fullscreen && adjustPanel}
            </aside>

            {photo && (
                <ExportDialog
                    open={exportOpen}
                    onOpenChange={setExportOpen}
                    original={photo.originalBlob}
                    name={photo.name}
                    getParams={() => paramsRef.current}
                    lut={lut}
                    photoSize={{ w: photo.width, h: photo.height }}
                />
            )}
            <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
            {session && (
                <DeletePresetDialog
                    userId={session.user.id}
                    preset={deletingPreset}
                    onClose={() => setDeletingPreset(null)}
                />
            )}
            <SavePresetDialog
                open={saveOpen}
                onOpenChange={setSaveOpen}
                getParams={() => paramsRef.current}
                base={basePreset}
                onSaved={(preset) => {
                    setScope('mine')
                    setSelectedPresetId(preset.id)
                    setBasePresetId(preset.id)
                }}
            />
        </div>
    )
}
