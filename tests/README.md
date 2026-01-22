# Tests

This directory contains the test suite for DataRoll using Vitest.

## Running Tests

```bash
# Run all tests once
npm test

# Watch mode for development
npm run test:watch

# Open Vitest UI (interactive test runner)
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                      # Global test setup, environment variables, and mocks
└── lib/                          # Library/utility tests
    ├── validation.test.ts        # Zod schema validation tests (10 tests)
    ├── validation-advanced.test.ts # Advanced schemas (16 tests)
    ├── encryption.test.ts        # AES-256-GCM encryption/decryption (6 tests)
    ├── errors.test.ts            # Error handling and formatting (20 tests)
    ├── utils.test.ts             # Utility function tests (4 tests)
    ├── audit.test.ts             # Audit logging tests (4 tests)
    └── permissions.test.ts       # Role-based permissions (13 tests)
```

**Total: 73 tests, all passing ✅**

## Writing Tests

### Basic Test Pattern
```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '@/lib/your-module'

describe('YourModule', () => {
  it('should do something', () => {
    const result = yourFunction('input')
    expect(result).toBe('expected output')
  })
})
```

### Async Tests
```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction()
  expect(result).toEqual(expectedValue)
})
```

### Testing Errors
```typescript
it('should throw on invalid input', async () => {
  await expect(
    functionThatThrows()
  ).rejects.toThrow('Expected error message')
})
```

### Validation Testing
```typescript
import { SomeSchema } from '@/lib/validation'

it('should validate correct input', () => {
  const result = SomeSchema.safeParse({ field: 'value' })
  expect(result.success).toBe(true)
})

it('should reject invalid input', () => {
  const result = SomeSchema.safeParse({ field: 123 })
  expect(result.success).toBe(false)
})
```

## Mocking

Global mocks are configured in `tests/setup.ts`:
- PostHog tracking functions are mocked to prevent tracking during tests
- Logger functions are mocked to reduce console output
- Environment variables are set for test isolation

## Coverage Goals

- ✅ **Validation schemas**: 100% - Critical for API security
- ✅ **Encryption/decryption**: 100% - Data security
- ✅ **Error handling**: 92% - Comprehensive error management
- ✅ **Utility functions**: 100% - Helper functions
- ✅ **Permissions**: 50% - Role-based access control
- ✅ **Audit logging**: 19% - Basic coverage
- 🎯 **Database operations**: Future priority
- 📝 **API routes**: Future (integration tests)

**Overall lib/ coverage: 13.36% statement coverage**  
(Focused on critical security and data integrity layers)

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification phases
3. **Single Responsibility**: Each test should verify one specific behavior
4. **Avoid Brittle Tests**: Don't test implementation details, test behavior
5. **Use Type Safety**: Leverage TypeScript in tests for better error catching
6. **Mock External Dependencies**: Keep tests fast and isolated

## Configuration

Test configuration is in `vitest.config.ts`:
- **Environment**: Node.js (for server-side code)
- **Coverage Provider**: v8 (fast and accurate)
- **Path Aliases**: Uses `@/` for absolute imports
- **Setup Files**: `tests/setup.ts` runs before all tests

## Continuous Integration

Tests should be run as part of CI/CD pipeline:
```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test -- --run
  
- name: Check coverage
  run: npm run test:coverage
```
