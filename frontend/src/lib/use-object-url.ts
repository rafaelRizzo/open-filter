// URL temporária para exibir um Blob em <img>, revogada ao trocar ou desmontar (sem vazar memória).
import { useEffect, useState } from 'react'

export const useObjectUrl = (blob: Blob | undefined) => {
    const [url, setUrl] = useState<string | null>(null)
    useEffect(() => {
        if (!blob) return
        const next = URL.createObjectURL(blob)
        setUrl(next)
        return () => URL.revokeObjectURL(next)
    }, [blob])
    return url
}
