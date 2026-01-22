import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, encryptCredentials, decryptCredentials } from '@/lib/encryption'

describe('Encryption', () => {
  const testPassword = 'test-password-for-encryption'
  const testData = 'sensitive data to encrypt'

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text', async () => {
      const encrypted = await encrypt(testData, testPassword)

      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted.data).not.toBe(testData)

      const decrypted = await decrypt(encrypted, testPassword)
      expect(decrypted).toBe(testData)
    })

    it('should produce different encrypted output each time', async () => {
      const encrypted1 = await encrypt(testData, testPassword)
      const encrypted2 = await encrypt(testData, testPassword)

      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })

    it('should fail to decrypt with wrong password', async () => {
      const encrypted = await encrypt(testData, testPassword)

      await expect(
        decrypt(encrypted, 'wrong-password')
      ).rejects.toThrow()
    })
  })

  describe('encryptCredentials/decryptCredentials', () => {
    it('should encrypt and decrypt credentials object', async () => {
      const credentials = {
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: 'secret',
      }

      const encrypted = await encryptCredentials(credentials, testPassword)
      expect(typeof encrypted).toBe('string')
      expect(encrypted).toContain(':') // Format: salt:iv:data

      const decrypted = await decryptCredentials(encrypted, testPassword)
      expect(decrypted).toEqual(credentials)
    })

    it('should handle complex nested objects', async () => {
      const credentials = {
        basic: {
          username: 'user',
          password: 'pass',
        },
        advanced: {
          ssl: true,
          options: {
            timeout: 30000,
          },
        },
      }

      const encrypted = await encryptCredentials(credentials, testPassword)
      const decrypted = await decryptCredentials(encrypted, testPassword)
      expect(decrypted).toEqual(credentials)
    })

    it('should fail to decrypt with wrong key', async () => {
      const credentials = { key: 'value' }
      const encrypted = await encryptCredentials(credentials, testPassword)

      await expect(
        decryptCredentials(encrypted, 'wrong-key')
      ).rejects.toThrow()
    })
  })
})
