import { describe, expect, it } from 'vitest'
import { parseTickerMessage, shouldAttemptReconnect } from '~/helpers/btcWSHelpers'
import type { BinanceTickerMessage } from '~/types/binance'

describe('btcWSHelpers', () => {
  describe('shouldAttemptReconnect', () => {
    it('returns false when close code is 1000 (manual disconnect)', () => {
      expect(shouldAttemptReconnect(1000, 0)).toBe(false)
      expect(shouldAttemptReconnect(1000, 3)).toBe(false)
      expect(shouldAttemptReconnect(1000, 5)).toBe(false)
    })

    it('returns true for non-1000 codes when under max attempts', () => {
      expect(shouldAttemptReconnect(1001, 0)).toBe(true)
      expect(shouldAttemptReconnect(1006, 2)).toBe(true)
      expect(shouldAttemptReconnect(1011, 4)).toBe(true)
    })

    it('returns false when attempts reach max', () => {
      expect(shouldAttemptReconnect(1001, 5)).toBe(false)
      expect(shouldAttemptReconnect(1006, 5)).toBe(false)
      expect(shouldAttemptReconnect(1011, 10)).toBe(false)
    })

    it('returns false when attempts exceed max', () => {
      expect(shouldAttemptReconnect(1001, 6)).toBe(false)
      expect(shouldAttemptReconnect(1006, 100)).toBe(false)
    })

    it('respects custom maxAttempts parameter', () => {
      expect(shouldAttemptReconnect(1001, 2, 3)).toBe(true)
      expect(shouldAttemptReconnect(1001, 3, 3)).toBe(false)
      expect(shouldAttemptReconnect(1001, 9, 10)).toBe(true)
      expect(shouldAttemptReconnect(1001, 10, 10)).toBe(false)
    })

    it('handles various WebSocket close codes', () => {
      // Various WebSocket close codes that should trigger reconnect
      expect(shouldAttemptReconnect(1002, 0)).toBe(true) // Protocol error
      expect(shouldAttemptReconnect(1003, 0)).toBe(true) // Unsupported data
      expect(shouldAttemptReconnect(1005, 0)).toBe(true) // No status received
      expect(shouldAttemptReconnect(1006, 0)).toBe(true) // Abnormal closure
      expect(shouldAttemptReconnect(1007, 0)).toBe(true) // Invalid frame payload
      expect(shouldAttemptReconnect(1008, 0)).toBe(true) // Policy violation
      expect(shouldAttemptReconnect(1009, 0)).toBe(true) // Message too big
      expect(shouldAttemptReconnect(1010, 0)).toBe(true) // Missing extension
      expect(shouldAttemptReconnect(1011, 0)).toBe(true) // Internal error
      expect(shouldAttemptReconnect(1015, 0)).toBe(true) // TLS handshake failure
    })
  })

  describe('parseTickerMessage', () => {
    it('parses Binance ticker message correctly', () => {
      const message: BinanceTickerMessage = {
        e: '24hrTicker',
        E: 1700000000000,
        s: 'BTCUSDT',
        p: '1500.50',
        P: '1.58',
        w: '95500.00',
        x: '94500.00',
        c: '96000.50',
        Q: '0.5',
        b: '95999.00',
        B: '1.0',
        a: '96001.00',
        A: '1.0',
        o: '94500.00',
        h: '97000.00',
        l: '94000.00',
        v: '10000',
        q: '950000000',
        O: 1699913600000,
        C: 1700000000000,
        F: 1000000,
        L: 1500000,
        n: 500000,
      }

      const result = parseTickerMessage(message)

      expect(result).toEqual({
        price: 96000.50,
        priceChange24h: 1500.50,
        priceChangePercent24h: 1.58,
        high24h: 97000.00,
        low24h: 94000.00,
        timestamp: 1700000000000,
      })
    })

    it('handles decimal precision correctly', () => {
      const message: BinanceTickerMessage = {
        e: '24hrTicker',
        E: 1700000000000,
        s: 'BTCUSDT',
        p: '-250.12345678',
        P: '-0.26',
        w: '95500.00',
        x: '94500.00',
        c: '95249.87654321',
        Q: '0.5',
        b: '95249.00',
        B: '1.0',
        a: '95250.00',
        A: '1.0',
        o: '95500.00',
        h: '96000.12345678',
        l: '94500.87654321',
        v: '10000',
        q: '950000000',
        O: 1699913600000,
        C: 1700000000000,
        F: 1000000,
        L: 1500000,
        n: 500000,
      }

      const result = parseTickerMessage(message)

      expect(result.price).toBeCloseTo(95249.87654321)
      expect(result.priceChange24h).toBeCloseTo(-250.12345678)
      expect(result.high24h).toBeCloseTo(96000.12345678)
      expect(result.low24h).toBeCloseTo(94500.87654321)
    })

    it('handles negative price change', () => {
      const message: BinanceTickerMessage = {
        e: '24hrTicker',
        E: 1700000000000,
        s: 'BTCUSDT',
        p: '-500.00',
        P: '-0.52',
        w: '95500.00',
        x: '96000.00',
        c: '95500.00',
        Q: '0.5',
        b: '95499.00',
        B: '1.0',
        a: '95501.00',
        A: '1.0',
        o: '96000.00',
        h: '96500.00',
        l: '95000.00',
        v: '10000',
        q: '950000000',
        O: 1699913600000,
        C: 1700000000000,
        F: 1000000,
        L: 1500000,
        n: 500000,
      }

      const result = parseTickerMessage(message)

      expect(result.priceChange24h).toBe(-500.00)
      expect(result.priceChangePercent24h).toBe(-0.52)
    })
  })
})
