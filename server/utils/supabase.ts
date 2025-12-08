/**
 * Server-side Supabase client
 * This runs only on the server, keeping credentials secure
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create server-side Supabase client
 */
export const getServerSupabase = (): SupabaseClient => {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const supabaseUrl = config.supabaseUrl as string
  const supabaseSecretKey = config.supabaseSecretKey as string

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error('Supabase server configuration missing. Set NUXT_SUPABASE_URL and NUXT_SUPABASE_SECRET_KEY env vars.')
  }

  supabaseClient = createClient(supabaseUrl, supabaseSecretKey)
  return supabaseClient
}

/**
 * Reset client (for testing)
 */
export const resetServerSupabase = () => {
  supabaseClient = null
}
