// Contrato front x back: o seed valida no schema zod e a migration mantém RLS, grants e limites.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { paramsSchema } from '../src/editor/params'

const backend = path.resolve(import.meta.dirname, '../../backend/supabase')
const seed = readFileSync(path.join(backend, 'seed.sql'), 'utf8')
const migration = readFileSync(path.join(backend, 'migrations/20261107120000_create_presets.sql'), 'utf8')

// Extrai as tuplas ('nome', 'json', ordem) do values(...) do seed.
const rows = [...seed.matchAll(/\('([^']+)',\s*'(\{[^']*\})',\s*(\d+)\)/g)].map(([, name, json, order]) => ({
    name: name as string,
    params: JSON.parse(json as string) as unknown,
    order: Number(order),
}))

describe('seed.sql', () => {
    it('tem presets oficiais incluindo Retrô', () => {
        expect(rows.length).toBeGreaterThanOrEqual(5)
        expect(rows.map((r) => r.name)).toContain('Retrô')
    })

    it.each(rows)('preset "$name" valida no schema zod do front', ({ params }) => {
        expect(paramsSchema.safeParse(params).success).toBe(true)
    })

    it('nomes únicos, até 50 caracteres, e ordem única', () => {
        expect(new Set(rows.map((r) => r.name)).size).toBe(rows.length)
        expect(new Set(rows.map((r) => r.order)).size).toBe(rows.length)
        for (const r of rows) expect(r.name.length).toBeLessThanOrEqual(50)
    })

    it('Retrô bate com o exemplo do seed', () => {
        const retro = rows.find((r) => r.name === 'Retrô')
        expect(paramsSchema.parse(retro?.params)).toMatchObject({
            exposure: -0.4,
            contrast: 0.1,
            saturation: -0.25,
            temperature: 15,
            grain: 0.6,
            sharpness: -0.3,
            vignette: 0.3,
        })
    })
})

describe('migration de presets', () => {
    it('liga RLS nas duas tabelas', () => {
        expect(migration).toMatch(/alter table public\.public_presets enable row level security/)
        expect(migration).toMatch(/alter table public\.user_presets enable row level security/)
    })

    it('public_presets: só SELECT para clientes, sem policy de escrita', () => {
        expect(migration).toMatch(/grant select on public\.public_presets to anon, authenticated/)
        const publicPolicies = migration.match(/create policy "public_presets_[^"]+"[\s\S]*?;/g) ?? []
        expect(publicPolicies).toHaveLength(1)
        expect(publicPolicies[0]).toMatch(/for select/)
    })

    it('user_presets: CRUD só para authenticated e sempre escopado por auth.uid()', () => {
        expect(migration).toMatch(/grant select, insert, update, delete on public\.user_presets to authenticated/)
        expect(migration).not.toMatch(/on public\.user_presets to [^;]*anon/)
        const policies = migration.match(/create policy "user_presets_[^"]+"[\s\S]*?;/g) ?? []
        expect(policies).toHaveLength(4)
        for (const p of policies) expect(p).toMatch(/\(select auth\.uid\(\)\)/)
        for (const op of ['select', 'insert', 'update', 'delete']) {
            expect(policies.some((p) => new RegExp(`for ${op}`).test(p))).toBe(true)
        }
    })

    it('user_id nasce de auth.uid() e limites de nome e tamanho estão como CHECK', () => {
        expect(migration).toMatch(/user_id uuid not null default auth\.uid\(\) references auth\.users/)
        expect(migration.match(/char_length\(name\) between 1 and 50/g)).toHaveLength(2)
        expect(migration.match(/pg_column_size\(params\) <= 2048/g)).toHaveLength(2)
    })

    it('updated_at tem trigger e a função fixa o search_path', () => {
        expect(migration).toMatch(/create trigger user_presets_set_updated_at/)
        expect(migration).toMatch(/set search_path = ''/)
    })
})
