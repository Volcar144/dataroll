import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base', isActive && 'active')
      expect(result).toBe('base active')
    })

    it('should filter out falsy values', () => {
      const result = cn('base', false && 'hidden', null, undefined, 'visible')
      expect(result).toBe('base visible')
    })

    it('should merge Tailwind classes correctly', () => {
      // tailwind-merge should deduplicate conflicting classes
      const result = cn('px-4 py-2', 'px-6')
      // Should keep px-6 (later value) and py-2
      expect(result).toContain('px-6')
      expect(result).toContain('py-2')
      expect(result).not.toContain('px-4')
    })
  })
})
