import { describe, it, expect } from 'vitest'
import { calculateScale } from './compress'

describe('calculateScale', () => {
  it('returns original dimensions when width <= maxWidth', () => {
    expect(calculateScale(800, 600, 1920)).toEqual({ w: 800, h: 600 })
  })

  it('scales down proportionally when width > maxWidth', () => {
    expect(calculateScale(3840, 2160, 1920)).toEqual({ w: 1920, h: 1080 })
  })

  it('handles portrait images (height > width, no scale needed)', () => {
    expect(calculateScale(1080, 1920, 1920)).toEqual({ w: 1080, h: 1920 })
  })

  it('scales wide portrait images', () => {
    expect(calculateScale(2400, 3200, 1920)).toEqual({ w: 1920, h: 2560 })
  })

  it('rounds dimensions to integers', () => {
    const { w, h } = calculateScale(3001, 2001, 1920)
    expect(Number.isInteger(w)).toBe(true)
    expect(Number.isInteger(h)).toBe(true)
  })
})
