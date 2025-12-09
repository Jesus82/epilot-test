// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/ui',
  ],

  // Auto-import composables from subdirectories and shared types
  imports: {
    dirs: [
      'composables/**',
    ],
  },
  devtools: { enabled: true },

  app: {
    head: {
      title: 'Epilot Test',
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Bitcoin Prediction Game' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/img/bt-logo.svg' },
      ],
    },
  },

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
