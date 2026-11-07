// Canvas PixiJS (WebGL): preview com filtro, zoom/pan, divisor antes/depois e aviso de estouro.
// Params entram por handle imperativo (sem re-render React por movimento de slider).
import { Application, Container, Sprite, Texture } from 'pixi.js'
import { type Ref, useEffect, useImperativeHandle, useRef } from 'react'
import { defaultGeometry, frameSize, type Geometry, straightenScale } from './geometry'
import type { Lut } from './lut'
import type { EditParams } from './params'
import { createEditFilter, type EditFilter } from './shader'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 8

/** Retângulo da imagem na tela, em px CSS relativos ao container. */
export type ViewRect = { x: number; y: number; w: number; h: number }
/** `rect` = área visível da foto (o corte); `frame` = o quadro inteiro (foto girada, sem cortar), na tela. */
export type ViewState = { rect: ViewRect; frame: ViewRect; zoom: number }

export type CanvasHandle = {
    setParams: (params: EditParams) => void
    /** true = mostra a original (filtro desligado). */
    setCompare: (on: boolean) => void
    /** 0 = sem divisor; 0..1 = posição (fração da largura da imagem). */
    setSplit: (fraction: number) => void
    setShowClip: (on: boolean) => void
    /** LUT 3D importado (null remove). */
    setLut: (lut: Lut | null) => void
    /** Multiplica o zoom em volta do ponto (px do container). Sem ponto, usa o centro. */
    zoomBy: (factor: number, point?: { x: number; y: number }) => void
    /** zoom 1 = imagem inteira visível. */
    resetView: () => void
    /** Corte, giro, espelho e endireitar (a foto original nunca é alterada). */
    setGeometry: (geometry: Geometry) => void
    /** true = mostra o quadro inteiro para editar o corte; false = mostra só a área cortada. */
    setCropMode: (on: boolean) => void
}

type Props = {
    bitmap: ImageBitmap
    initialParams: EditParams
    initialLut?: Lut | null
    initialGeometry?: Geometry
    ref?: Ref<CanvasHandle>
    className?: string
    /** false = sem zoom/arrasto/duplo clique (ex: demo na landing, que não pode capturar a rolagem da página). */
    interactive?: boolean
    onViewChange?: (view: ViewState) => void
}

type Engine = {
    app: Application
    sprite: Sprite
    edit: EditFilter
    schedule: () => void
    layout: () => void
    state: {
        zoom: number
        panX: number
        panY: number
        split: number
        showClip: boolean
        compare: boolean
        geometry: Geometry
        cropMode: boolean
    }
}

export function PhotoCanvas({
    bitmap,
    initialParams,
    initialLut,
    initialGeometry,
    ref,
    className,
    interactive = true,
    onViewChange,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null)
    const engineRef = useRef<Engine | null>(null)
    // Lido só no init: mudanças posteriores chegam por setParams, sem recriar o canvas.
    const initialRef = useRef(initialParams)
    const initialLutRef = useRef(initialLut ?? null)
    const initialGeometryRef = useRef(initialGeometry ?? defaultGeometry())
    const interactiveRef = useRef(interactive)
    const onViewRef = useRef(onViewChange)
    onViewRef.current = onViewChange

    useImperativeHandle(ref, () => {
        const zoomAround = (engine: Engine, next: number, point?: { x: number; y: number }) => {
            const { app, state } = engine
            const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
            if (clamped === state.zoom) return
            const cx = point?.x ?? app.screen.width / 2
            const cy = point?.y ?? app.screen.height / 2
            // Mantém o ponto sob o cursor parado: o pan compensa a mudança de escala.
            const ratio = clamped / state.zoom
            state.panX =
                cx - app.screen.width / 2 - (cx - app.screen.width / 2 - state.panX) * ratio
            state.panY =
                cy - app.screen.height / 2 - (cy - app.screen.height / 2 - state.panY) * ratio
            state.zoom = clamped
            engine.layout()
        }
        const withEngine = (fn: (e: Engine) => void) => {
            const engine = engineRef.current
            if (engine) fn(engine)
        }
        return {
            setParams: (params) =>
                withEngine((e) => {
                    e.edit.setParams(params)
                    e.schedule()
                }),
            setCompare: (on) =>
                withEngine((e) => {
                    e.state.compare = on
                    e.edit.filter.enabled = !on
                    e.schedule()
                }),
            setSplit: (fraction) =>
                withEngine((e) => {
                    e.state.split = fraction
                    e.edit.setView({ split: fraction, showClip: e.state.showClip })
                    e.schedule()
                }),
            setShowClip: (on) =>
                withEngine((e) => {
                    e.state.showClip = on
                    e.edit.setView({ split: e.state.split, showClip: on })
                    e.schedule()
                }),
            setLut: (lut) =>
                withEngine((e) => {
                    e.edit.setLut(lut)
                    e.schedule()
                }),
            zoomBy: (factor, point) =>
                withEngine((e) => zoomAround(e, e.state.zoom * factor, point)),
            resetView: () =>
                withEngine((e) => {
                    e.state.zoom = 1
                    e.state.panX = 0
                    e.state.panY = 0
                    e.layout()
                }),
            setGeometry: (geometry) =>
                withEngine((e) => {
                    e.state.geometry = geometry
                    e.layout()
                }),
            setCropMode: (on) =>
                withEngine((e) => {
                    e.state.cropMode = on
                    // Entrar ou sair do corte enquadra de novo: o zoom antigo não faz sentido na outra visão.
                    e.state.zoom = 1
                    e.state.panX = 0
                    e.state.panY = 0
                    e.layout()
                }),
        }
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const app = new Application()
        let disposed = false
        let ready = false
        let frame = 0
        let observer: ResizeObserver | null = null
        const cleanups: (() => void)[] = []

        // init é assíncrono: no StrictMode o cleanup roda antes dele terminar, por isso a flag.
        const setup = async () => {
            await app.init({
                resizeTo: container,
                backgroundAlpha: 0,
                antialias: true,
                autoDensity: true,
                autoStart: false,
                resolution: window.devicePixelRatio,
                preference: 'webgl',
            })
            ready = true
            if (disposed) {
                app.destroy(true, { children: true, texture: true })
                return
            }
            container.appendChild(app.canvas)

            const edit = createEditFilter(initialRef.current)
            // O padrão do filtro é resolução 1: em tela 2x ele renderizava em baixa e esticava,
            // perdendo nitidez frente ao "comparar com original". 'inherit' usa a do canvas.
            edit.filter.resolution = 'inherit'
            edit.setLut(initialLutRef.current)
            const sprite = new Sprite(Texture.from(bitmap))
            sprite.anchor.set(0.5)
            sprite.filters = [edit.filter]
            // A máscara fica no contêiner (não no sprite): máscara e filtro no mesmo objeto se atrapalham.
            const view = new Container()
            view.addChild(sprite)
            app.stage.addChild(view)

            // Render sob demanda (sem ticker): coalesce vários eventos de slider num frame só.
            const schedule = () => {
                // Depois de desmontar, o app já foi destruído: renderizar agora quebra dentro do Pixi.
                if (frame || disposed) return
                frame = requestAnimationFrame(() => {
                    frame = 0
                    if (disposed) return
                    app.render()
                })
            }

            let lastRect: { x: number; y: number; w: number; h: number } | null = null
            const state = {
                zoom: 1,
                panX: 0,
                panY: 0,
                split: 0,
                showClip: false,
                compare: false,
                geometry: initialGeometryRef.current,
                cropMode: false,
            }

            const layout = () => {
                const { width, height } = app.screen
                const g = state.geometry
                // Quadro = foto depois dos quartos de volta. Corte e zoom trabalham em px do quadro.
                const fr = frameSize(bitmap.width, bitmap.height, g)
                const cw = state.cropMode ? fr.w : g.crop.w * fr.w
                const ch = state.cropMode ? fr.h : g.crop.h * fr.h
                const scale = Math.min(width / cw, height / ch) * state.zoom
                const vw = cw * scale
                const vh = ch * scale
                // Pan limitado: a área visível nunca sai inteira da tela; sem zoom não há pan.
                const maxX = Math.max(0, (vw - width) / 2)
                const maxY = Math.max(0, (vh - height) / 2)
                state.panX = Math.min(maxX, Math.max(-maxX, state.panX))
                state.panY = Math.min(maxY, Math.max(-maxY, state.panY))
                const centerX = width / 2 + state.panX
                const centerY = height / 2 + state.panY
                const rect = { x: centerX - vw / 2, y: centerY - vh / 2, w: vw, h: vh }

                // Onde fica o centro do quadro: o corte, não o quadro, é que fica centralizado na tela.
                const dx = state.cropMode ? 0 : (g.crop.x + g.crop.w / 2 - 0.5) * fr.w
                const dy = state.cropMode ? 0 : (g.crop.y + g.crop.h / 2 - 0.5) * fr.h
                const px = centerX - dx * scale
                const py = centerY - dy * scale
                // Endireitar amplia o mínimo para a foto girada cobrir o quadro sem canto vazio.
                const grow = straightenScale(fr.w, fr.h, g.straighten)
                sprite.position.set(px, py)
                sprite.rotation = (g.rotate * Math.PI) / 2 + (g.straighten * Math.PI) / 180
                sprite.scale.set(
                    scale * grow * (g.flipX ? -1 : 1),
                    scale * grow * (g.flipY ? -1 : 1),
                )

                const frame = {
                    x: px - (fr.w * scale) / 2,
                    y: py - (fr.h * scale) / 2,
                    w: fr.w * scale,
                    h: fr.h * scale,
                }
                // Editando o corte: mostra o quadro inteiro. Fora disso: só a área cortada.
                const m = state.cropMode ? frame : rect
                // O recorte é feito no shader: máscara do Pixi ficava presa ao tamanho antigo do canvas na tela cheia.
                edit.setClip(m)

                lastRect = rect
                // O shader localiza o fragmento na imagem em unidades de mundo (px CSS): informa onde ela está.
                edit.setImageRect(rect)
                schedule()
                onViewRef.current?.({ zoom: state.zoom, rect, frame })
            }

            engineRef.current = { app, sprite, edit, schedule, layout, state }
            layout()
            app.renderer.on('resize', layout)
            // O resizeTo do Pixi só escuta a janela; o container também muda quando o layout muda
            // (ex: aparece a linha de intensidade, entra em tela cheia), então observamos o elemento.
            observer = new ResizeObserver(() => {
                // Direto, sem a fila do resizeTo: na tela cheia o Pixi chegava a renderizar com o alvo antigo.
                const w = container.clientWidth
                const h = container.clientHeight
                if (w > 0 && h > 0) app.renderer.resize(w, h, window.devicePixelRatio)
            })
            observer.observe(container)

            // A densidade de pixels muda com o zoom do navegador e ao trocar de monitor. O canvas nasce com a
            // do momento; sem acompanhar, ao diminuir e aumentar a página a foto aparece ampliada e cortada.
            // matchMedia só avisa uma vez por valor, então reassina com a densidade nova a cada mudança.
            let dprQuery: MediaQueryList | null = null
            const onDprChange = () => {
                app.renderer.resize(app.screen.width, app.screen.height, window.devicePixelRatio)
                watchDpr()
            }
            const watchDpr = () => {
                dprQuery?.removeEventListener('change', onDprChange)
                dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`)
                dprQuery.addEventListener('change', onDprChange, { once: true })
            }
            watchDpr()
            cleanups.push(() => dprQuery?.removeEventListener('change', onDprChange))

            if (interactiveRef.current) {
                // Zoom em volta de um ponto (px do container): o ponto sob o cursor fica parado.
                const zoomAt = (next: number, cx: number, cy: number) => {
                    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
                    if (clamped === state.zoom) return
                    const ratio = clamped / state.zoom
                    state.panX =
                        cx - app.screen.width / 2 - (cx - app.screen.width / 2 - state.panX) * ratio
                    state.panY =
                        cy -
                        app.screen.height / 2 -
                        (cy - app.screen.height / 2 - state.panY) * ratio
                    state.zoom = clamped
                    layout()
                }

                // Zoom com a roda (listener nativo: o do React é passivo e não deixa preventDefault).
                const onWheel = (e: WheelEvent) => {
                    e.preventDefault()
                    const box = container.getBoundingClientRect()
                    zoomAt(
                        state.zoom * Math.exp(-e.deltaY * 0.0015),
                        e.clientX - box.left,
                        e.clientY - box.top,
                    )
                }
                container.addEventListener('wheel', onWheel, { passive: false })
                cleanups.push(() => container.removeEventListener('wheel', onWheel))

                // Duplo clique alterna o zoom, mas só quando cai em cima da foto (não na área vazia
                // em volta). Os controles são irmãos deste elemento: seus cliques nem chegam aqui.
                const onDoubleClick = (e: MouseEvent) => {
                    const box = container.getBoundingClientRect()
                    const x = e.clientX - box.left
                    const y = e.clientY - box.top
                    const r = lastRect
                    if (!r || x < r.x || x > r.x + r.w || y < r.y || y > r.y + r.h) return
                    if (state.zoom > 1) {
                        state.zoom = 1
                        state.panX = 0
                        state.panY = 0
                        layout()
                    } else zoomAt(3, x, y)
                }
                container.addEventListener('dblclick', onDoubleClick)
                cleanups.push(() => container.removeEventListener('dblclick', onDoubleClick))

                // Arrastar para mover (só com zoom > 1).
                let drag: { x: number; y: number } | null = null
                const onDown = (e: PointerEvent) => {
                    if (state.zoom <= 1) return
                    drag = { x: e.clientX, y: e.clientY }
                    container.setPointerCapture(e.pointerId)
                    container.style.cursor = 'grabbing'
                }
                const onMove = (e: PointerEvent) => {
                    if (!drag) return
                    // Soltou fora da janela: sem botão pressionado o arrasto acaba.
                    if (e.buttons === 0) return onUp()
                    state.panX += e.clientX - drag.x
                    state.panY += e.clientY - drag.y
                    drag = { x: e.clientX, y: e.clientY }
                    layout()
                }
                const onUp = () => {
                    drag = null
                    container.style.cursor = state.zoom > 1 ? 'grab' : ''
                }
                container.addEventListener('pointerdown', onDown)
                container.addEventListener('pointermove', onMove)
                container.addEventListener('pointerup', onUp)
                container.addEventListener('pointercancel', onUp)
                container.addEventListener('lostpointercapture', onUp)
                cleanups.push(() => {
                    container.removeEventListener('pointerdown', onDown)
                    container.removeEventListener('pointermove', onMove)
                    container.removeEventListener('pointerup', onUp)
                    container.removeEventListener('lostpointercapture', onUp)
                    container.removeEventListener('pointercancel', onUp)
                })
            }
        }
        void setup()

        return () => {
            disposed = true
            for (const c of cleanups) c()
            observer?.disconnect()
            cancelAnimationFrame(frame)
            const engine = engineRef.current
            if (engine) {
                engine.sprite.filters = null
                engine.edit.dispose()
            }
            engineRef.current = null
            if (ready) app.destroy(true, { children: true, texture: true })
        }
    }, [bitmap])

    return <div ref={containerRef} className={className} />
}
