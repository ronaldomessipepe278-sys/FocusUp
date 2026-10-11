console.log('URL de Supabase detectada:', import.meta.env.VITE_SUPABASE_URL ? 'SÍ' : 'NO')
console.log('Clave de Supabase detectada:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'SÍ' : 'NO')

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Falta la configuración de Supabase en .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseKey)