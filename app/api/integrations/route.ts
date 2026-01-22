import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { encryptCredentials, decryptCredentials } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

const CreateIntegrationSchema = z.object({
  type: z.enum(['EMAIL', 'SLACK', 'WEBHOOK', 'PAGERDUTY', 'DISCORD', 'TEAMS']),
  name: z.string().min(1).max(100),
  teamId: z.string().optional(),
  isDefault: z.boolean().default(false),
  config: z.object({
    // Email config
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    fromAddress: z.string().email().optional(),
    secure: z.boolean().optional(),
    // Slack/Discord/Teams config
    webhookUrl: z.string().url().optional(),
    channel: z.string().optional(),
    // Generic webhook config
    url: z.string().url().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    authType: z.enum(['none', 'basic', 'bearer', 'api_key']).optional(),
    authValue: z.string().optional(),
  }),
});

const UpdateIntegrationSchema = CreateIntegrationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// GET /api/integrations - List user's integrations
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const teamId = searchParams.get('teamId');

    const where: any = {
      userId: session.user.id,
    };

    if (type) {
      where.type = type;
    }

    if (teamId) {
      where.OR = [
        { teamId: null }, // Personal integrations
        { teamId }, // Team integrations
      ];
    }

    const integrations = await prisma.userIntegration.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    // Return integrations with decrypted config (but mask sensitive fields)
    const safeIntegrations = await Promise.all(integrations.map(async integration => {
      let config: any = {};
      try {
        config = await decryptCredentials(integration.config, ENCRYPTION_KEY);
        // Mask sensitive fields
        if (config.password) config.password = '••••••••';
        if (config.authValue) config.authValue = '••••••••';
      } catch {
        config = { error: 'Failed to decrypt' };
      }

      return {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        teamId: integration.teamId,
        isActive: integration.isActive,
        isDefault: integration.isDefault,
        config,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      };
    }));

    return NextResponse.json({
      success: true,
      data: safeIntegrations,
    });
  } catch (error) {
    console.error('Failed to list integrations:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list integrations' } },
      { status: 500 }
    );
  }
}

// POST /api/integrations - Create a new integration
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateIntegrationSchema.parse(body);

    // If teamId provided, verify user has access
    if (validatedData.teamId) {
      const teamMember = await prisma.teamMember.findFirst({
        where: {
          teamId: validatedData.teamId,
          userId: session.user.id,
        },
      });

      if (!teamMember) {
        return NextResponse.json(
          { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
          { status: 403 }
        );
      }
    }

    // If setting as default, unset other defaults of same type
    if (validatedData.isDefault) {
      await prisma.userIntegration.updateMany({
        where: {
          userId: session.user.id,
          type: validatedData.type,
          teamId: validatedData.teamId || null,
        },
        data: { isDefault: false },
      });
    }

    // Encrypt the config
    const encryptedConfig = await encryptCredentials(validatedData.config, ENCRYPTION_KEY);

    const integration = await prisma.userIntegration.create({
      data: {
        userId: session.user.id,
        type: validatedData.type,
        name: validatedData.name,
        teamId: validatedData.teamId,
        isDefault: validatedData.isDefault,
        config: encryptedConfig,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        teamId: integration.teamId,
        isActive: integration.isActive,
        isDefault: integration.isDefault,
        createdAt: integration.createdAt,
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Failed to create integration:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create integration' } },
      { status: 500 }
    );
  }
}
