import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('your-supabase-project')) {
  console.warn('SafarSaathi: Supabase URL is using placeholder values. Please update .env with your actual Supabase project credentials.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
