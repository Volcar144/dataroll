import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/email';

export interface NotificationConfig {
  emailService?: EmailService;
  slackWebhook?: string;
}

export class NotificationService {
  private emailService?: EmailService;
  private slackWebhook?: string;

  constructor(config: NotificationConfig = {}) {
    this.emailService = config.emailService;
    this.slackWebhook = config.slackWebhook;
  }

  async notifyQueryApprovalRequest(
    queryId: string,
    userId: string,
    connectionId: string,
    query: string
  ) {
    try {
      // Get user and connection details
      const [user, connection] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          include: { notificationPreferences: true },
        }),
        prisma.databaseConnection.findUnique({
          where: { id: connectionId },
          include: { team: { include: { members: { include: { user: { include: { notificationPreferences: true } } } } } } },
        }),
      ]);

      if (!user || !connection) {
        console.error('User or connection not found for notification');
        return;
      }

      const teamMembers = connection.team.members;

      // Send email notifications
      if (this.emailService) {
        await this.sendEmailNotifications(teamMembers, user, connection, query, queryId);
      }

      // Send Slack notifications
      if (this.slackWebhook) {
        await this.sendSlackNotification(teamMembers, user, connection, query, queryId);
      }

    } catch (error) {
      console.error('Failed to send approval request notifications:', error);
    }
  }

  private async sendEmailNotifications(
    teamMembers: any[],
    requester: any,
    connection: any,
    query: string,
    queryId: string
  ) {
    if (!this.emailService) return;

    const subject = `Query Approval Request - ${connection.name}`;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const member of teamMembers) {
      const user = member.user;
      const prefs = user.notificationPreferences;

      // Check if user wants email notifications for approvals
      if (!prefs?.emailOnSuccess) continue; // Using emailOnSuccess as proxy for approval notifications

      const html = `
        <h2>Query Approval Request</h2>
        <p><strong>Requester:</strong> ${requester.name || requester.email}</p>
        <p><strong>Connection:</strong> ${connection.name} (${connection.environment})</p>
        <p><strong>Query:</strong></p>
        <pre style="background: #f4f4f4; padding: 10px; border-radius: 4px;">${query}</pre>
        <p>
          <a href="${baseUrl}/dashboard/connections/${connection.id}/queries/${queryId}/approve"
             style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Review Query
          </a>
        </p>
      `;

      await this.emailService.sendEmail(user.email, subject, html);
    }
  }

  private async sendSlackNotification(
    teamMembers: any[],
    requester: any,
    connection: any,
    query: string,
    queryId: string
  ) {
    if (!this.slackWebhook) return;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const message = {
      text: `Query Approval Request`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🔍 Query Approval Request - ${connection.name}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Requester:* ${requester.name || requester.email}`
            },
            {
              type: 'mrkdwn',
              text: `*Connection:* ${connection.name} (${connection.environment})`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Query:*\n\`\`\`${query.substring(0, 500)}${query.length > 500 ? '...' : ''}\`\`\``
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'Review Query'
              },
              url: `${baseUrl}/dashboard/connections/${connection.id}/queries/${queryId}/approve`
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Failed to send Slack notification:', response.statusText);
      }
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }
}