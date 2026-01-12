import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

export interface EncryptedData {
  data: string
  salt: string
  iv: string
}

export async function encrypt(text: string, password: string): Promise<EncryptedData> {
  const salt = randomBytes(16)
  const key = (await scryptAsync(password, salt, 32)) as Buffer
  const iv = randomBytes(16)
  
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return {
    data: encrypted + authTag.toString('hex'),
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
  }
}

export async function decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
  const { data, salt, iv } = encryptedData
  
  const saltBuffer = Buffer.from(salt, 'hex')
  const key = (await scryptAsync(password, saltBuffer, 32)) as Buffer
  const ivBuffer = Buffer.from(iv, 'hex')
  
  const decipher = createDecipheriv('aes-256-gcm', key, ivBuffer)
  
  const authTag = Buffer.from(data.slice(-32), 'hex')
  const encrypted = data.slice(0, -32)
  
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}

export async function encryptCredentials(credentials: any, encryptionKey: string): Promise<string> {
  const jsonString = JSON.stringify(credentials)
  const result = await encrypt(jsonString, encryptionKey)
  return `${result.salt}:${result.iv}:${result.data}`
}

export async function decryptCredentials(encryptedString: string, encryptionKey: string): Promise<any> {
  const [salt, iv, data] = encryptedString.split(':')
  const encryptedData = { salt, iv, data }
  const decrypted = await decrypt(encryptedData, encryptionKey)
  return JSON.parse(decrypted)
}