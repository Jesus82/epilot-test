import { vi } from 'vitest'
import { ref, computed, isRef, watch, watchEffect } from 'vue'
import {
  defineEventHandler,
  getQuery,
  getRouterParam,
  readBody,
  createError,
} from 'h3'

// Stub Vue reactivity functions as globals (mimicking Nuxt auto-imports)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('isRef', isRef)
vi.stubGlobal('watch', watch)
vi.stubGlobal('watchEffect', watchEffect)

// Stub H3/Nitro server globals (for server-side API tests)
vi.stubGlobal('defineEventHandler', defineEventHandler)
vi.stubGlobal('getQuery', getQuery)
vi.stubGlobal('getRouterParam', getRouterParam)
vi.stubGlobal('readBody', readBody)
vi.stubGlobal('createError', createError)
