import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { WorkflowEngine } from '@/lib/workflows/engine';
import { ExecuteWorkflowSchema } from '@/lib/workflows/validation';
import { createAuditLog } from '@/lib/audit';
import { AuditAction } from '@prisma/client';
import { captureServerException } from '@/lib/posthog-server';
import { logger } from '@/lib/logger';

// POST /api/workflows/[workflowId]/execute - Trigger a workflow execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { workflowId } = await params;

    // Verify user has access to this workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        team: {
          include: {
            members: {
              where: { userId: session.user.id },
            },
          },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      );
    }

    if (workflow.team.members.length === 0) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to this workflow' } },
        { status: 403 }
      );
    }

    // Check if workflow allows manual triggers
    if (workflow.trigger !== 'manual') {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: `Workflow trigger type is '${workflow.trigger}', not 'manual'. Only manual trigger workflows can be executed directly.` } },
        { status: 400 }
      );
    }

    // Check if workflow is published
    if (!workflow.isPublished) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Workflow must be published before it can be executed. Save and publish the workflow first.' } },
        { status: 400 }
      );
    }

    // Parse and validate request body
    let body = {};
    try {
      const text = await request.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch {
      // Empty body is fine for manual triggers
    }

    const validatedData = ExecuteWorkflowSchema.parse(body);

    // Execute the workflow
    const result = await WorkflowEngine.execute(
      workflowId,
      {
        workflowId,
        currentUser: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name || undefined,
        },
        variables: validatedData.variables || {},
        previousOutputs: {},
        teamId: workflow.teamId,
      },
      session.user.id
    );

    // Create audit log
    await createAuditLog({
      action: AuditAction.WORKFLOW_EXECUTED,
      resource: 'workflow',
      resourceId: workflowId,
      details: {
        executionId: result.executionId,
        trigger: 'manual',
        variables: validatedData.variables,
      },
      teamId: workflow.teamId,
      userId: session.user.id,
    });

    logger.info({
      msg: 'Workflow execution started',
      workflowId,
      executionId: result.executionId,
      userId: session.user.id,
      trigger: 'manual',
    });

    return NextResponse.json({
      data: {
        executionId: result.executionId,
        status: result.status,
        message: 'Workflow execution started',
      },
    });
  } catch (error) {
    console.error('Error executing workflow:', error);
    
    await captureServerException(
      error instanceof Error ? error : new Error(String(error)),
      undefined,
      { context: 'workflow_execute' }
    );

    if (error instanceof Error && error.message.includes('not published')) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to execute workflow' } },
      { status: 500 }
    );
  }
}
