import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UpdateWorkflowSchema } from '@/lib/workflows/validation';
import { WorkflowParser } from '@/lib/workflows/parser';
import { logger, securityLogger } from '@/lib/telemetry';
import { z } from 'zod';

// Extended schema for update with nodes/edges
const UpdateWorkflowWithNodesSchema = UpdateWorkflowSchema.extend({
  teamId: z.string().optional(),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    data: z.record(z.string(), z.any()),
  })).optional(),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })).optional(),
});

// GET /api/workflows/[workflowId] - Get single workflow with definition
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  let session: any = null;
  const resolvedParams = await params;

  try {
    session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id: resolvedParams.workflowId },
      include: {
        definitions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        team: {
          select: { id: true, name: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      );
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: workflow.teamId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      securityLogger.unauthorized('view_workflow', `workflow:${resolvedParams.workflowId}`, {
        userId: session.user.id,
        workflowId: resolvedParams.workflowId,
      });

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const latestDefinition = workflow.definitions[0];
    let nodes: any[] = [];
    let edges: any[] = [];

    if (latestDefinition) {
      try {
        nodes = JSON.parse(latestDefinition.nodes || '[]');
        edges = JSON.parse(latestDefinition.edges || '[]');
      } catch {
        // If parsing fails, use empty arrays
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        trigger: workflow.trigger,
        isPublished: workflow.isPublished,
        version: workflow.version,
        tags: workflow.tags,
        teamId: workflow.teamId,
        team: workflow.team,
        nodes,
        edges,
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to get workflow', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      workflowId: resolvedParams.workflowId,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to get workflow' } },
      { status: 500 }
    );
  }
}

// PUT /api/workflows/[workflowId] - Update workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  let session: any = null;
  const resolvedParams = await params;

  try {
    session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateWorkflowWithNodesSchema.parse(body);

    // Get existing workflow
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id: resolvedParams.workflowId },
      include: {
        definitions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      );
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: existingWorkflow.teamId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN', 'DEVELOPER'] },
      },
    });

    if (!teamMember) {
      securityLogger.unauthorized('update_workflow', `workflow:${resolvedParams.workflowId}`, {
        userId: session.user.id,
        workflowId: resolvedParams.workflowId,
      });

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied or insufficient permissions' } },
        { status: 403 }
      );
    }

    // Serialize nodes and edges
    const nodesJson = validatedData.nodes ? JSON.stringify(validatedData.nodes) : undefined;
    const edgesJson = validatedData.edges ? JSON.stringify(validatedData.edges) : undefined;

    // Use transaction to update workflow and create new definition version
    const result = await prisma.$transaction(async (tx) => {
      // Update workflow metadata
      const updatedWorkflow = await tx.workflow.update({
        where: { id: resolvedParams.workflowId },
        data: {
          name: validatedData.name,
          description: validatedData.description,
          trigger: validatedData.trigger,
          tags: validatedData.tags,
          isPublished: validatedData.isPublished,
          version: { increment: 1 },
        },
      });

      // Create new definition version if nodes/edges are provided
      if (nodesJson || edgesJson) {
        const currentVersion = existingWorkflow.definitions[0]?.version || 0;
        const newVersion = currentVersion + 1;

        const definition = WorkflowParser.reconstructDefinition(
          validatedData.name || existingWorkflow.name,
          validatedData.description || existingWorkflow.description || undefined,
          validatedData.trigger || existingWorkflow.trigger,
          [],
          nodesJson || existingWorkflow.definitions[0]?.nodes || '[]',
          edgesJson || existingWorkflow.definitions[0]?.edges || '[]',
        );

        const newDefinition = await tx.workflowDefinition.create({
          data: {
            workflowId: resolvedParams.workflowId,
            content: WorkflowParser.stringify(definition),
            format: 'json',
            nodes: nodesJson || existingWorkflow.definitions[0]?.nodes || '[]',
            edges: edgesJson || existingWorkflow.definitions[0]?.edges || '[]',
            version: newVersion,
            changelog: `Updated workflow definition`,
            createdBy: session.user.id,
          },
        });

        // Update workflow to point to new definition
        await tx.workflow.update({
          where: { id: resolvedParams.workflowId },
          data: { definitionId: newDefinition.id },
        });
      }

      return updatedWorkflow;
    });

    logger.info('Workflow updated', {
      workflowId: result.id,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        name: result.name,
        description: result.description,
        trigger: result.trigger,
        isPublished: result.isPublished,
        version: result.version,
        tags: result.tags,
        updatedAt: result.updatedAt,
      },
    });
  } catch (error) {
    logger.error('Failed to update workflow', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      workflowId: resolvedParams.workflowId,
    });

    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: zodError.issues[0]?.message || 'Validation failed' } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update workflow' } },
      { status: 500 }
    );
  }
}

// DELETE /api/workflows/[workflowId] - Delete workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  let session: any = null;
  const resolvedParams = await params;

  try {
    session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Get existing workflow
    const existingWorkflow = await prisma.workflow.findUnique({
      where: { id: resolvedParams.workflowId },
    });

    if (!existingWorkflow) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Workflow not found' } },
        { status: 404 }
      );
    }

    // Verify user has access to delete (only OWNER or ADMIN)
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: existingWorkflow.teamId,
        userId: session.user.id,
        role: { in: ['OWNER', 'ADMIN'] },
      },
    });

    if (!teamMember) {
      securityLogger.unauthorized('delete_workflow', `workflow:${resolvedParams.workflowId}`, {
        userId: session.user.id,
        workflowId: resolvedParams.workflowId,
      });

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Only team owners or admins can delete workflows' } },
        { status: 403 }
      );
    }

    // Delete workflow (cascade will handle definitions, executions, etc.)
    await prisma.workflow.delete({
      where: { id: resolvedParams.workflowId },
    });

    logger.info('Workflow deleted', {
      workflowId: resolvedParams.workflowId,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete workflow', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
      workflowId: resolvedParams.workflowId,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to delete workflow' } },
      { status: 500 }
    );
  }
}
