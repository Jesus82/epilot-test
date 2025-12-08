// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxt/ui',
  ],

  // Auto-import composables from subdirectories and shared types
  imports: {
    dirs: [
      'composables/**',
    ],
  },
  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css',
  ],

  runtimeConfig: {
    // Server-only Supabase credentials
    // Set via NUXT_SUPABASE_URL and NUXT_SUPABASE_SECRET_KEY env vars
    // Uses new Supabase key format: sb_secret_... (replaces service_role key)
    supabaseUrl: '',
    supabaseSecretKey: '',
    public: {
      // No Supabase credentials exposed to client
    },
  },

  // Make shared types available via alias
  alias: {
    '~shared': '../shared',
  },
  compatibilityDate: '2025-07-15',

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
