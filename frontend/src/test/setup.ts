// Setup global dos testes: IndexedDB falso e limpeza do DOM entre testes.
import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => cleanup())
