// Cliente Supabase único. Só a anon key vai no front; a foto nunca passa por aqui.
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
    throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em frontend/.env')
}

export const supabase = createClient(url, anonKey)
