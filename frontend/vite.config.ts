// Config do Vite: router com code-splitting, Tailwind v4, alias @/ e Vitest com cobertura.
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
    resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
    test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            include: ['src/**/*.{ts,tsx}'],
            // shadcn é vendorizado; o canvas depende de WebGL real (sem GPU no jsdom);
            // rotas e main são cola fina de framework, cobertas ao rodar o app.
            exclude: [
                'src/components/ui/**',
                'src/routeTree.gen.ts',
                'src/main.tsx',
                'src/routes/**',
                'src/editor/photo-canvas.tsx',
                'src/test/**',
                '**/*.test.{ts,tsx}',
            ],
            thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
        },
    },
})
