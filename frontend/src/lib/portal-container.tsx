// Onde menus e dicas devem ser montados. Em tela cheia só o elemento em tela cheia é visível: o body não.
import { createContext, useContext } from 'react'

const PortalContainerContext = createContext<HTMLElement | null>(null)

export const PortalContainerProvider = PortalContainerContext.Provider

/** Elemento em tela cheia, ou undefined (usa o body, o padrão). Nunca null: no Base UI null significa "sem destino". */
export const usePortalContainer = () => useContext(PortalContainerContext) ?? undefined
