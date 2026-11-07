// ZIP mínimo sem compressão ("stored"): suficiente para o backup (JPEG/PNG já são comprimidos).
// Sem zip64: arquivo ou total acima de 4 GB é recusado com erro claro.

const MAX = 0xffffffff
const encoder = new TextEncoder()

let crcTable: Uint32Array | null = null
const crc32 = (bytes: Uint8Array) => {
    if (!crcTable) {
        crcTable = new Uint32Array(256)
        for (let n = 0; n < 256; n++) {
            let c = n
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
            crcTable[n] = c >>> 0
        }
    }
    let crc = 0xffffffff
    for (const b of bytes) crc = (crcTable[(crc ^ b) & 0xff] as number) ^ (crc >>> 8)
    return (crc ^ 0xffffffff) >>> 0
}

const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff])
const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff])
const concat = (parts: Uint8Array[]) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
    let o = 0
    for (const p of parts) {
        out.set(p, o)
        o += p.length
    }
    return out
}

export type ZipEntry = { name: string; data: Blob }

export const createZip = async (entries: ZipEntry[]): Promise<Blob> => {
    const parts: BlobPart[] = []
    const central: Uint8Array[] = []
    let offset = 0

    for (const { name, data } of entries) {
        if (data.size > MAX) throw new Error(`Arquivo grande demais para o backup: ${name}`)
        const bytes = new Uint8Array(await data.arrayBuffer())
        const nameBytes = encoder.encode(name)
        const crc = crc32(bytes)
        // flag 0x0800: nome em UTF-8. Data/hora fixas (1980-01-01): o backup é reproduzível.
        const header = concat([
            u32(0x04034b50),
            u16(20),
            u16(0x0800),
            u16(0),
            u16(0),
            u16(0x21),
            u32(crc),
            u32(bytes.length),
            u32(bytes.length),
            u16(nameBytes.length),
            u16(0),
            nameBytes,
        ])
        parts.push(header, bytes)
        central.push(
            concat([
                u32(0x02014b50),
                u16(20),
                u16(20),
                u16(0x0800),
                u16(0),
                u16(0),
                u16(0x21),
                u32(crc),
                u32(bytes.length),
                u32(bytes.length),
                u16(nameBytes.length),
                u16(0),
                u16(0),
                u16(0),
                u16(0),
                u32(0),
                u32(offset),
                nameBytes,
            ]),
        )
        offset += header.length + bytes.length
        if (offset > MAX) throw new Error('Backup passa de 4 GB: exporte em partes')
    }

    const centralBytes = concat(central)
    parts.push(
        centralBytes,
        concat([
            u32(0x06054b50),
            u16(0),
            u16(0),
            u16(entries.length),
            u16(entries.length),
            u32(centralBytes.length),
            u32(offset),
            u16(0),
        ]),
    )
    return new Blob(parts, { type: 'application/zip' })
}

/** Lê um ZIP gerado por createZip (só entradas sem compressão). */
export const readZip = async (file: Blob): Promise<Map<string, Blob>> => {
    const buf = new Uint8Array(await file.arrayBuffer())
    const view = new DataView(buf.buffer)
    let eocd = -1
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
            eocd = i
            break
        }
    }
    if (eocd < 0) throw new Error('Arquivo de backup inválido')

    const count = view.getUint16(eocd + 10, true)
    let p = view.getUint32(eocd + 16, true)
    const out = new Map<string, Blob>()
    const decoder = new TextDecoder()
    for (let i = 0; i < count; i++) {
        if (view.getUint32(p, true) !== 0x02014b50) throw new Error('Arquivo de backup corrompido')
        const method = view.getUint16(p + 10, true)
        const size = view.getUint32(p + 24, true)
        const nameLen = view.getUint16(p + 28, true)
        const extraLen = view.getUint16(p + 30, true)
        const commentLen = view.getUint16(p + 32, true)
        const localOffset = view.getUint32(p + 42, true)
        const name = decoder.decode(buf.subarray(p + 46, p + 46 + nameLen))
        if (method !== 0) throw new Error('Backup com compressão não é suportado')
        const localNameLen = view.getUint16(localOffset + 26, true)
        const localExtraLen = view.getUint16(localOffset + 28, true)
        const start = localOffset + 30 + localNameLen + localExtraLen
        out.set(name, new Blob([buf.slice(start, start + size)]))
        p += 46 + nameLen + extraLen + commentLen
    }
    return out
}
