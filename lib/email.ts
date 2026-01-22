import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(config: EmailConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const mailOptions = {
        from: process.env.FROM_EMAIL || 'noreply@dataroll.com',
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Failed to send email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, userName: string) {
    const subject = 'Reset Your Password - DataRoll';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #111827; font-size: 24px; font-weight: 600; margin: 0;">Reset Your Password</h1>
            </div>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              Hi ${userName},
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset your password for your DataRoll account. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
                Reset Password
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                ⚠️ This link will expire in <strong>1 hour</strong> for security reasons.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 8px;">
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #6366f1; font-size: 12px; word-break: break-all; margin: 0;">
              <a href="${resetUrl}" style="color: #6366f1;">${resetUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} DataRoll. All rights reserved.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(to, subject, html);
  }

  async sendTeamInvitationEmail(
    to: string,
    inviterName: string,
    teamName: string,
    invitationUrl: string
  ) {
    const subject = `You're invited to join ${teamName} on DataRoll`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Team Invitation</h2>
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to join the <strong>${teamName}</strong> team on DataRoll.</p>
        <p>DataRoll is a database management platform that helps teams collaborate on database operations with proper review and approval workflows.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        <p>This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.</p>
        <p>Best regards,<br>The DataRoll Team</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${invitationUrl}">${invitationUrl}</a>
        </p>
      </div>
    `;

    return this.sendEmail(to, subject, html);
  }
}

// Create email service instance if SMTP is configured
let emailService: EmailService | null = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailService = new EmailService({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    from: process.env.FROM_EMAIL || 'noreply@dataroll.com',
  });
}

export { emailService };

// Helper function for password reset emails - used by auth.ts
export async function sendPasswordResetEmail(to: string, resetUrl: string, userName: string): Promise<void> {
  if (emailService) {
    await emailService.sendPasswordResetEmail(to, resetUrl, userName);
  } else {
    // Log for development - in production, ensure SMTP is configured
    console.log(`[DEV] Password reset email for ${to}:`);
    console.log(`[DEV] Reset URL: ${resetUrl}`);
  }
}