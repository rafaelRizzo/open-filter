// LUT 3D no formato .cube (Adobe/Resolve): vira uma textura 2D (n*n) x n, fatias de azul lado a lado.

export type Lut = {
    name: string
    size: number
    /** RGBA8, largura size*size, altura size. Pixel (b*size + r, g). */
    data: Uint8Array
}

const MAX_SIZE = 65

export const parseCube = (text: string, name = 'LUT'): Lut => {
    let size = 0
    let title = name
    const min = [0, 0, 0]
    const max = [1, 1, 1]
    const values: number[] = []

    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const first = line.charAt(0)
        if (/[A-Za-z]/.test(first)) {
            const [key, ...rest] = line.split(/\s+/)
            if (key === 'LUT_3D_SIZE') size = Number(rest[0])
            else if (key === 'LUT_1D_SIZE')
                throw new Error('LUT 1D não é suportado, use um LUT 3D (.cube)')
            else if (key === 'TITLE') title = rest.join(' ').replace(/^"|"$/g, '') || name
            else if (key === 'DOMAIN_MIN') for (let i = 0; i < 3; i++) min[i] = Number(rest[i])
            else if (key === 'DOMAIN_MAX') for (let i = 0; i < 3; i++) max[i] = Number(rest[i])
            continue
        }
        const parts = line.split(/\s+/).map(Number)
        if (parts.length >= 3 && parts.every((n) => Number.isFinite(n)))
            values.push(parts[0] as number, parts[1] as number, parts[2] as number)
    }

    if (!Number.isInteger(size) || size < 2 || size > MAX_SIZE)
        throw new Error('LUT inválido: tamanho fora de 2 a 65')
    if (values.length !== size * size * size * 3)
        throw new Error('LUT inválido: quantidade de valores não bate com o tamanho')

    const data = new Uint8Array(size * size * size * 4)
    const rowLength = size * size
    for (let i = 0; i < size * size * size; i++) {
        // Na ordem do arquivo o vermelho varia mais rápido, depois verde, depois azul.
        const r = i % size
        const g = Math.floor(i / size) % size
        const b = Math.floor(i / rowLength)
        const o = (g * rowLength + b * size + r) * 4
        for (let c = 0; c < 3; c++) {
            const range = (max[c] as number) - (min[c] as number) || 1
            const v = ((values[i * 3 + c] as number) - (min[c] as number)) / range
            data[o + c] = Math.round(Math.min(1, Math.max(0, v)) * 255)
        }
        data[o + 3] = 255
    }
    return { name: title, size, data }
}
