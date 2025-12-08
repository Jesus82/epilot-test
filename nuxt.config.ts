// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/image',
    '@nuxt/ui',
  ],
  devtools: { enabled: true },

  css: [
    '~/assets/css/main.css',
  ],

  runtimeConfig: {
    public: {
      // Supabase - set via NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_ANON_KEY env vars
      supabaseUrl: '',
      supabaseAnonKey: '',
    },
  },
  compatibilityDate: '2025-07-15',

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
