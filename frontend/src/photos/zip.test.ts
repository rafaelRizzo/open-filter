// Testes do ZIP sem compressão: ida e volta, nomes unicode, vazio e arquivo inválido.
import { describe, expect, it } from 'vitest'
import { createZip, readZip } from './zip'

const text = async (b: Blob) => new TextDecoder().decode(await b.arrayBuffer())

describe('zip', () => {
    it('ida e volta preserva nomes e bytes', async () => {
        const bytes = new Uint8Array(70000).map((_, i) => i % 251)
        const zip = await createZip([
            { name: 'a.txt', data: new Blob(['olá mundo']) },
            { name: 'fotos/ção.bin', data: new Blob([bytes]) },
            { name: 'vazio', data: new Blob([]) },
        ])
        const back = await readZip(zip)
        expect([...back.keys()]).toEqual(['a.txt', 'fotos/ção.bin', 'vazio'])
        expect(await text(back.get('a.txt') as Blob)).toBe('olá mundo')
        expect(new Uint8Array(await (back.get('fotos/ção.bin') as Blob).arrayBuffer())).toEqual(
            bytes,
        )
        expect((back.get('vazio') as Blob).size).toBe(0)
    })

    it('zip sem entradas lê como mapa vazio', async () => {
        expect((await readZip(await createZip([]))).size).toBe(0)
    })

    it('rejeita arquivo que não é zip', async () => {
        await expect(
            readZip(new Blob(['isto não é um zip de verdade, nem de longe'])),
        ).rejects.toThrow()
    })
})
