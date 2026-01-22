import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { encryptCredentials, decryptCredentials } from '@/lib/encryption';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

const UpdateIntegrationSchema = z.object({
  type: z.enum(['EMAIL', 'SLACK', 'WEBHOOK', 'PAGERDUTY', 'DISCORD', 'TEAMS']).optional(),
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  config: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    fromAddress: z.string().email().optional(),
    secure: z.boolean().optional(),
    webhookUrl: z.string().url().optional(),
    channel: z.string().optional(),
    url: z.string().url().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    authType: z.enum(['none', 'basic', 'bearer', 'api_key']).optional(),
    authValue: z.string().optional(),
  }).optional(),
});

// GET /api/integrations/[id] - Get a specific integration
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const integration = await prisma.userIntegration.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Integration not found' } },
        { status: 404 }
      );
    }

    let config: any = {};
    try {
      config = await decryptCredentials(integration.config, ENCRYPTION_KEY);
      // Mask sensitive fields
      if (config.password) config.password = '••••••••';
      if (config.authValue) config.authValue = '••••••••';
    } catch {
      config = { error: 'Failed to decrypt' };
    }

    return NextResponse.json({
      success: true,
      data: {
        id: integration.id,
        type: integration.type,
        name: integration.name,
        teamId: integration.teamId,
        isActive: integration.isActive,
        isDefault: integration.isDefault,
        config,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt,
      },
    });
  } catch (error) {
    console.error('Failed to get integration:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get integration' } },
      { status: 500 }
    );
  }
}

// PATCH /api/integrations/[id] - Update an integration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const integration = await prisma.userIntegration.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Integration not found' } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateIntegrationSchema.parse(body);

    const updateData: any = {};

    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    
    // Handle isDefault - unset others if setting this one as default
    if (validatedData.isDefault === true) {
      await prisma.userIntegration.updateMany({
        where: {
          userId: session.user.id,
          type: integration.type,
          teamId: integration.teamId,
          id: { not: integration.id },
        },
        data: { isDefault: false },
      });
      updateData.isDefault = true;
    } else if (validatedData.isDefault === false) {
      updateData.isDefault = false;
    }

    // If config is provided, merge with existing config
    if (validatedData.config) {
      let existingConfig = {};
      try {
        existingConfig = await decryptCredentials(integration.config, ENCRYPTION_KEY);
      } catch {
        // Ignore decrypt errors
      }

      const newConfig = { ...existingConfig, ...validatedData.config };
      updateData.config = await encryptCredentials(newConfig, ENCRYPTION_KEY);
    }

    const updated = await prisma.userIntegration.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        type: updated.type,
        name: updated.name,
        isActive: updated.isActive,
        isDefault: updated.isDefault,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }

    console.error('Failed to update integration:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update integration' } },
      { status: 500 }
    );
  }
}

// DELETE /api/integrations/[id] - Delete an integration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const integration = await prisma.userIntegration.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!integration) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Integration not found' } },
        { status: 404 }
      );
    }

    await prisma.userIntegration.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Integration deleted',
    });
  } catch (error) {
    console.error('Failed to delete integration:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete integration' } },
      { status: 500 }
    );
  }
}
