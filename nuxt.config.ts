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
      // API base URL - set via NUXT_PUBLIC_API_BASE_URL env var
      apiBaseUrl: '',
    },
  },
  compatibilityDate: '2025-07-15',

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
