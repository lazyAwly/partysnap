import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Mike Birthday Party')).toBe('mike-birthday-party')
  })

  it('removes special characters', () => {
    expect(slugify("Mike's B-Day!!")).toBe('mikes-b-day')
  })

  it('collapses multiple spaces/hyphens', () => {
    expect(slugify('New   Year   Eve')).toBe('new-year-eve')
  })

  it('trims whitespace', () => {
    expect(slugify('  party  ')).toBe('party')
  })

  it('truncates to 50 characters', () => {
    expect(slugify('a'.repeat(60))).toHaveLength(50)
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})
