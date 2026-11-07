// Atalhos de teclado do editor. Ignora digitação em campos de texto e tecla com diálogo aberto.
import { useEffect, useRef } from 'react'

export type ShortcutHandlers = {
    toggleSplit: () => void
    holdCompare: (on: boolean) => void
    toggleFullscreen: () => void
    toggleClip: () => void
    reset: () => void
    undo: () => void
    redo: () => void
    selectTab: (index: number) => void
    exportPhoto: () => void
    showHelp: () => void
    zoomIn: () => void
    zoomOut: () => void
    fit: () => void
    cycleGrid: () => void
    toggleHorizon: () => void
    rotateSpiral: () => void
    mirrorSpiral: () => void
}

const TEXT_INPUT = /^(text|search|email|url|tel|password|number)$/

const isTyping = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable || target.tagName === 'TEXTAREA') return true
    // Slider usa <input type=range>: não é digitação, os atalhos continuam valendo nele.
    return target instanceof HTMLInputElement && TEXT_INPUT.test(target.type)
}

export const useShortcuts = (handlers: ShortcutHandlers) => {
    // Ref para o listener ser registrado uma vez e sempre chamar a versão mais recente.
    const ref = useRef(handlers)
    ref.current = handlers

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isTyping(e.target)) return
            if (document.querySelector('[role=dialog]')) return
            const h = ref.current
            const mod = e.ctrlKey || e.metaKey
            const key = e.key.toLowerCase()

            if (mod && key === 'z') {
                e.preventDefault()
                return e.shiftKey ? h.redo() : h.undo()
            }
            if (mod && key === 'y') {
                e.preventDefault()
                return h.redo()
            }
            if (mod && key === 'e') {
                e.preventDefault()
                return h.exportPhoto()
            }
            if (mod || e.altKey) return

            if (key === '\\') h.toggleSplit()
            else if (key === 'c' && !e.repeat) h.holdCompare(true)
            else if (key === 'f') h.toggleFullscreen()
            else if (key === 'j') h.toggleClip()
            else if (key === 'g') h.cycleGrid()
            else if (key === 'h') h.toggleHorizon()
            else if (key === 'o') (e.shiftKey ? h.mirrorSpiral : h.rotateSpiral)()
            else if (key === 'r') h.reset()
            else if (key === '?') h.showHelp()
            else if (key === '+' || key === '=') h.zoomIn()
            else if (key === '-') h.zoomOut()
            else if (key === '0') h.fit()
            else if (/^[1-8]$/.test(key)) h.selectTab(Number(key) - 1)
        }
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'c' && !isTyping(e.target)) ref.current.holdCompare(false)
        }
        window.addEventListener('keydown', onKeyDown)
        window.addEventListener('keyup', onKeyUp)
        return () => {
            window.removeEventListener('keydown', onKeyDown)
            window.removeEventListener('keyup', onKeyUp)
        }
    }, [])
}
