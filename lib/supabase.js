import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnon) {
  if (typeof window !== 'undefined') {
    console.error('Missing Supabase environment variables. Please check your .env.local file or Vercel environment variables.')
  }
}

// Browser client — used in components
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnon || 'placeholder-key'
)

// Server client — used in API routes (keeps service key secret)
export const supabaseAdmin = () =>
  createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
  )
