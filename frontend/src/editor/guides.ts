// Geometria das grades de composição (só preview, nunca exportadas). Tudo em px do retângulo da foto na tela.

export const GRID_KINDS = ['off', 'thirds', 'center', 'golden', 'phi', 'diagonals'] as const
export type GridKind = (typeof GRID_KINDS)[number]

export const GRID_LABELS: Record<GridKind, string> = {
    off: 'Sem grade',
    thirds: 'Terços (jogo da velha)',
    center: 'Centro',
    golden: 'Proporção áurea (espiral)',
    phi: 'Grade áurea (38,2% e 61,8%)',
    diagonals: 'Diagonais',
}

export const PHI = (1 + Math.sqrt(5)) / 2
/** Posição das linhas da grade áurea: 1/φ² e 1/φ (38,2% e 61,8%). */
export const GOLDEN = [1 - 1 / PHI, 1 / PHI] as const

export type Segment = { x1: number; y1: number; x2: number; y2: number }

/** Próxima grade ao apertar G. */
export const nextGrid = (kind: GridKind): GridKind =>
    GRID_KINDS[(GRID_KINDS.indexOf(kind) + 1) % GRID_KINDS.length] as GridKind

/** Linhas retas da grade para um retângulo w x h. */
export const gridSegments = (kind: GridKind, w: number, h: number): Segment[] => {
    const v = (f: number): Segment => ({ x1: w * f, y1: 0, x2: w * f, y2: h })
    const hz = (f: number): Segment => ({ x1: 0, y1: h * f, x2: w, y2: h * f })
    const diagonals: Segment[] = [
        { x1: 0, y1: 0, x2: w, y2: h },
        { x1: 0, y1: h, x2: w, y2: 0 },
    ]
    switch (kind) {
        case 'thirds':
            return [v(1 / 3), v(2 / 3), hz(1 / 3), hz(2 / 3)]
        case 'center':
            return [v(0.5), hz(0.5), ...diagonals]
        case 'phi':
            return [v(GOLDEN[0]), v(GOLDEN[1]), hz(GOLDEN[0]), hz(GOLDEN[1])]
        case 'diagonals':
            return diagonals
        default:
            return []
    }
}

export type Point2 = [number, number]

/** Orientações da espiral: 4 giros de 90° x espelho = 8. */
export const SPIRAL_ORIENTATIONS = 8

/** Gira/espelha um ponto do quadrado unitário. 0 a 3 giram no sentido horário; 4 a 7 espelham antes. */
export const orientPoint = ([a, b]: Point2, orientation: number): Point2 => {
    const x = orientation >= 4 ? 1 - a : a
    switch (orientation % 4) {
        case 0:
            return [x, b]
        case 1:
            return [1 - b, x]
        case 2:
            return [1 - x, 1 - b]
        default:
            return [b, 1 - x]
    }
}

export type GoldenFigure = {
    /** Espiral como polilinha, em coordenadas normalizadas (0 a 1) do retângulo. */
    spiral: Point2[]
    /** Linhas que separam os quadrados da sequência, normalizadas: [x1, y1, x2, y2]. */
    squares: [number, number, number, number][]
}

const ARC_STEPS = 28

/**
 * Espiral áurea e seus quadrados. Constrói no retângulo φ:1 (quadrado à esquerda, depois topo, direita e
 * base, repetindo) e normaliza para 0..1: a figura é esticada para cobrir exatamente a foto, como nos
 * editores de imagem, sem sobrar margem nem vazar. Cada arco é um quarto de círculo e termina onde o
 * próximo começa. `orientation` gira e espelha o resultado.
 */
export const goldenFigure = (orientation = 0): GoldenFigure => {
    let x = 0
    let y = 0
    let cw = PHI
    let ch = 1
    const spiral: Point2[] = []
    const squares: [number, number, number, number][] = []
    const norm = (u: number, v: number): Point2 => orientPoint([u / PHI, v], orientation)

    for (let i = 0; i < 9; i++) {
        let s: number
        let center: Point2
        let startAngle: number
        let line: [number, number, number, number]
        let next: [number, number, number, number]
        switch (i % 4) {
            case 0: // quadrado à esquerda
                s = ch
                center = [x + s, y + s]
                startAngle = Math.PI
                line = [x + s, y, x + s, y + ch]
                next = [x + s, y, cw - s, ch]
                break
            case 1: // quadrado no topo
                s = cw
                center = [x, y + s]
                startAngle = -Math.PI / 2
                line = [x, y + s, x + cw, y + s]
                next = [x, y + s, cw, ch - s]
                break
            case 2: // quadrado à direita
                s = ch
                center = [x + cw - s, y]
                startAngle = 0
                line = [x + cw - s, y, x + cw - s, y + ch]
                next = [x, y, cw - s, ch]
                break
            default: // quadrado na base
                s = cw
                center = [x + cw, y + ch - s]
                startAngle = Math.PI / 2
                line = [x, y + ch - s, x + cw, y + ch - s]
                next = [x, y, cw, ch - s]
        }
        // Todos os arcos giram 90° no mesmo sentido (horário na tela).
        for (let k = i === 0 ? 0 : 1; k <= ARC_STEPS; k++) {
            const angle = startAngle + ((Math.PI / 2) * k) / ARC_STEPS
            spiral.push(norm(center[0] + s * Math.cos(angle), center[1] + s * Math.sin(angle)))
        }
        const p1 = norm(line[0], line[1])
        const p2 = norm(line[2], line[3])
        squares.push([p1[0], p1[1], p2[0], p2[1]])
        ;[x, y, cw, ch] = next
    }
    return { spiral, squares }
}

/** Orientação inicial: retrato começa com o quadrado em cima, paisagem com o quadrado à esquerda. */
export const baseSpiralOrientation = (w: number, h: number) => (h > w ? 1 : 0)
