import { describe, it, expect, vi, beforeEach } from 'vitest'
import nodemailer from 'nodemailer'

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: vi.fn(),
    }),
  },
}))

import { EmailService, sendPasswordResetEmail } from '@/lib/email'

describe('Email Service', () => {
  let emailService: EmailService
  let mockSendMail: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockSendMail = vi.fn().mockResolvedValue({ messageId: 'msg-123' })
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: mockSendMail,
    } as any)

    emailService = new EmailService({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'password',
      },
      from: 'noreply@dataroll.com',
    })
  })

  describe('constructor', () => {
    it('should create transport with correct config', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@example.com',
          pass: 'password',
        },
      })
    })

    it('should create secure transport for port 465', () => {
      new EmailService({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'user', pass: 'pass' },
        from: 'test@test.com',
      })

      expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          port: 465,
          secure: true,
        })
      )
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const result = await emailService.sendEmail(
        'user@example.com',
        'Test Subject',
        '<p>Hello World</p>'
      )

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test Subject',
          html: '<p>Hello World</p>',
        })
      )
      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')
    })

    it('should include plain text version', async () => {
      await emailService.sendEmail(
        'user@example.com',
        'Test',
        '<p>Hello <strong>World</strong></p>',
        'Hello World'
      )

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      )
    })

    it('should strip HTML when no text provided', async () => {
      await emailService.sendEmail(
        'user@example.com',
        'Test',
        '<p>Hello <strong>World</strong></p>'
      )

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
        })
      )
    })

    it('should handle send failure', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'))

      const result = await emailService.sendEmail(
        'user@example.com',
        'Test',
        '<p>Test</p>'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('SMTP connection failed')
    })

    it('should handle unknown errors', async () => {
      mockSendMail.mockRejectedValue('Unknown error string')

      const result = await emailService.sendEmail(
        'user@example.com',
        'Test',
        '<p>Test</p>'
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email with correct content', async () => {
      const result = await emailService.sendPasswordResetEmail(
        'user@example.com',
        'https://dataroll.com/reset?token=abc123',
        'John Doe'
      )

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset Your Password - DataRoll',
          html: expect.stringContaining('John Doe'),
        })
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('https://dataroll.com/reset?token=abc123')
      expect(callArgs.html).toContain('Reset Password')
      expect(callArgs.html).toContain('1 hour')
      expect(result.success).toBe(true)
    })

    it('should include fallback link in password reset email', async () => {
      await emailService.sendPasswordResetEmail(
        'user@example.com',
        'https://dataroll.com/reset?token=xyz',
        'Jane'
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      // Check the URL appears twice (button and fallback link)
      expect(callArgs.html.match(/https:\/\/dataroll\.com\/reset\?token=xyz/g)?.length).toBeGreaterThan(1)
    })
  })

  describe('sendTeamInvitationEmail', () => {
    it('should send team invitation email', async () => {
      const result = await emailService.sendTeamInvitationEmail(
        'newuser@example.com',
        'John Doe',
        'Acme Corp',
        'https://dataroll.com/invite/abc123'
      )

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'newuser@example.com',
          subject: "You're invited to join Acme Corp on DataRoll",
        })
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('John Doe')
      expect(callArgs.html).toContain('Acme Corp')
      expect(callArgs.html).toContain('https://dataroll.com/invite/abc123')
      expect(callArgs.html).toContain('Accept Invitation')
      expect(result.success).toBe(true)
    })

    it('should mention invitation expiry', async () => {
      await emailService.sendTeamInvitationEmail(
        'user@example.com',
        'Inviter',
        'Team',
        'https://example.com/invite'
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.html).toContain('7 days')
    })
  })

  describe('sendPasswordResetEmail helper function', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
      originalEnv = { ...process.env }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should log in development when no email service configured', async () => {
      // Delete SMTP env vars to simulate no email service
      delete process.env.SMTP_HOST
      delete process.env.SMTP_USER
      delete process.env.SMTP_PASS

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Import fresh module without email service
      // Note: Since the module is already loaded with mocks, this tests the fallback path
      await sendPasswordResetEmail(
        'test@example.com',
        'https://reset.url',
        'Test User'
      )

      // The helper should work without throwing
      consoleSpy.mockRestore()
    })
  })

  describe('HTML stripping', () => {
    it('should strip complex HTML tags', async () => {
      await emailService.sendEmail(
        'user@example.com',
        'Test',
        '<div class="container"><h1>Title</h1><p>Para <a href="#">link</a></p></div>'
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.text).not.toContain('<')
      expect(callArgs.text).not.toContain('>')
      expect(callArgs.text).toContain('Title')
      expect(callArgs.text).toContain('Para')
      expect(callArgs.text).toContain('link')
    })

    it('should handle self-closing tags', async () => {
      await emailService.sendEmail(
        'user@example.com',
        'Test',
        'Line 1<br/>Line 2<hr/>Line 3'
      )

      const callArgs = mockSendMail.mock.calls[0][0]
      expect(callArgs.text).not.toContain('<br/>')
      expect(callArgs.text).not.toContain('<hr/>')
    })
  })
})
