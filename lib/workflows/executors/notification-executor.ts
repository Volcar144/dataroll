import { NodeExecutor, ExecutionContext, NodeExecutionResult, ValidationResult } from '../engine';
import { NotificationNodeData } from '../types';
import { emailService } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export class NotificationExecutor implements NodeExecutor {
  async execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeData = node.data as NotificationNodeData;

    try {
      let result: any;

      switch (nodeData.provider) {
        case 'email':
          result = await this.sendEmail(nodeData, context, previousOutput);
          break;

        case 'slack':
          result = await this.sendSlackMessage(nodeData, context, previousOutput);
          break;

        case 'webhook':
          result = await this.sendWebhook(nodeData, context, previousOutput);
          break;

        case 'pagerduty':
          result = await this.sendPagerDuty(nodeData, context, previousOutput);
          break;

        case 'team_notification':
          result = await this.sendTeamNotification(nodeData, context, previousOutput);
          break;

        default:
          throw new Error(`Unknown notification provider: ${nodeData.provider}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: any): ValidationResult {
    const nodeData = node.data as NotificationNodeData;
    const errors: string[] = [];

    if (!nodeData.provider) {
      errors.push('Notification provider is required');
    }

    switch (nodeData.provider) {
      case 'email':
        if (!nodeData.recipients && !nodeData.recipient) {
          errors.push('Email recipients are required');
        }
        if (!nodeData.subject) {
          errors.push('Email subject is required');
        }
        break;

      case 'slack':
        if (!nodeData.channel) {
          errors.push('Slack channel is required');
        }
        break;

      case 'webhook':
        if (!nodeData.url) {
          errors.push('Webhook URL is required');
        }
        break;

      case 'pagerduty':
        if (!nodeData.recipient) {
          errors.push('PagerDuty recipient is required');
        }
        break;

      case 'team_notification':
        if (!nodeData.teamId) {
          errors.push('Team ID is required for team notifications');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async sendEmail(
    nodeData: NotificationNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<any> {
    if (!emailService) {
      throw new Error('Email service not configured');
    }

    const recipients = nodeData.recipients || (nodeData.recipient ? [nodeData.recipient] : []);
    const subject = nodeData.subject || 'Workflow Notification';
    const message = nodeData.message || 'Workflow notification';

    const results = [];

    for (const recipient of recipients) {
      const result = await emailService.sendEmail(recipient, subject, message);
      results.push({
        recipient,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    return {
      provider: 'email',
      recipients,
      subject,
      results,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendSlackMessage(
    nodeData: NotificationNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<any> {
    const webhookUrl = nodeData.url || nodeData.webhook;
    if (!webhookUrl) {
      throw new Error('Slack webhook URL is required');
    }

    const channel = nodeData.channel;
    const message = nodeData.message || 'Workflow notification';

    const payload = {
      channel,
      text: message,
      attachments: [
        {
          color: '#36a64f',
          fields: [
            {
              title: 'Workflow',
              value: context.workflowId,
              short: true,
            },
            {
              title: 'Execution',
              value: context.executionId,
              short: true,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`);
    }

    return {
      provider: 'slack',
      webhookUrl,
      channel,
      message,
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendWebhook(
    nodeData: NotificationNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<any> {
    const url = nodeData.url || nodeData.webhook;
    if (!url) {
      throw new Error('Webhook URL is required');
    }

    const method = nodeData.method || 'POST';
    const headers = nodeData.headers || { 'Content-Type': 'application/json' };
    const body = nodeData.body || JSON.stringify({
      workflowId: context.workflowId,
      executionId: context.executionId,
      message: nodeData.message,
      previousOutput,
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(url, {
      method,
      headers,
      body: method !== 'GET' ? body : undefined,
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json().catch(() => null);

    return {
      provider: 'webhook',
      url,
      method,
      status: response.status,
      response: responseData,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendPagerDuty(
    nodeData: NotificationNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<any> {
    // In a real implementation, this would integrate with PagerDuty API
    // For now, return a mock result
    const recipient = nodeData.recipient!;
    const message = nodeData.message!;

    console.log('Sending PagerDuty alert:', {
      recipient,
      message,
      workflowId: context.workflowId,
      executionId: context.executionId,
    });

    return {
      provider: 'pagerduty',
      recipient,
      message,
      sent: true,
      timestamp: new Date().toISOString(),
    };
  }

  private async sendTeamNotification(
    nodeData: NotificationNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<any> {
    const teamId = nodeData.teamId!;
    const message = nodeData.message!;

    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (teamMembers.length === 0) {
      throw new Error(`No members found in team: ${teamId}`);
    }

    // Send email to all team members
    const recipientEmails = teamMembers.map(member => member.user.email).filter(Boolean) as string[];

    if (recipientEmails.length === 0) {
      throw new Error(`No valid email addresses found for team members in team: ${teamId}`);
    }

    if (!emailService) {
      throw new Error('Email service not configured');
    }

    const subject = nodeData.subject || `Team Notification: Workflow ${context.workflowId}`;

    const results = [];

    for (const recipient of recipientEmails) {
      const result = await emailService.sendEmail(recipient, subject, message);
      results.push({
        recipient,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    return {
      provider: 'team_notification',
      teamId,
      recipientCount: recipientEmails.length,
      recipients: recipientEmails,
      message,
      results,
      timestamp: new Date().toISOString(),
    };
  }
}