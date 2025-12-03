import { vi } from 'vitest'
import { ref, computed, isRef, watch, watchEffect } from 'vue'

// Stub Vue reactivity functions as globals (mimicking Nuxt auto-imports)
vi.stubGlobal('ref', ref)
vi.stubGlobal('computed', computed)
vi.stubGlobal('isRef', isRef)
vi.stubGlobal('watch', watch)
vi.stubGlobal('watchEffect', watchEffect)
