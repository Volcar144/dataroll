import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CreateWorkflowSchema, UpdateWorkflowSchema, ExecuteWorkflowSchema } from '@/lib/workflows/validation';
import { WorkflowParser } from '@/lib/workflows/parser';
import { logger, securityLogger } from '@/lib/telemetry';

// GET /api/workflows - List workflows for a team
export async function GET(request: NextRequest) {
  let session: any = null;

  try {
    session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const status = searchParams.get('status'); // 'published', 'draft'
    const trigger = searchParams.get('trigger'); // 'manual', 'scheduled', 'webhook', 'event'

    if (!teamId) {
      return NextResponse.json(
        { error: { code: 'MISSING_TEAM_ID', message: 'Team ID is required' } },
        { status: 400 }
      );
    }

    // Verify user has access to this team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      securityLogger.unauthorized('list_workflows', `team:${teamId}`, {
        userId: session.user.id,
        teamId,
      });

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      );
    }

    // Build filter
    const where: any = { teamId };

    if (status === 'published') {
      where.isPublished = true;
    } else if (status === 'draft') {
      where.isPublished = false;
    }

    if (trigger) {
      where.trigger = trigger;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      include: {
        executions: {
          orderBy: { triggeredAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get execution counts separately
    const workflowIds = workflows.map(w => w.id);
    const executionCounts = await prisma.workflowExecution.groupBy({
      by: ['workflowId'],
      where: {
        workflowId: { in: workflowIds },
      },
      _count: {
        workflowId: true,
      },
    });

    const countMap = new Map(
      executionCounts.map(item => [item.workflowId, item._count.workflowId])
    );

    const formattedWorkflows = workflows.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger,
      isPublished: workflow.isPublished,
      publishedAt: workflow.publishedAt,
      version: workflow.version,
      tags: workflow.tags,
      lastExecuted: workflow.executions?.[0]?.triggeredAt || null,
      executionCount: countMap.get(workflow.id) || 0,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    }));

    return NextResponse.json({
      data: formattedWorkflows,
      meta: {
        total: formattedWorkflows.length,
        teamId,
      },
    });

  } catch (error) {
    logger.error('Failed to list workflows', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    });

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to list workflows' } },
      { status: 500 }
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  let session: any = null;

  try {
    session = await getSession(request);
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = CreateWorkflowSchema.parse(body);

    // Verify user has access to the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: validatedData.teamId,
        userId: session.user.id,
      },
    });

    if (!teamMember) {
      securityLogger.unauthorized('create_workflow', `team:${validatedData.teamId}`, {
        userId: session.user.id,
        teamId: validatedData.teamId,
      });

      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Access denied to team' } },
        { status: 403 }
      );
    }

    // Use a transaction to handle the circular dependency between Workflow and WorkflowDefinition
    const result = await prisma.$transaction(async (tx) => {
      // First, create the workflow with a temporary definitionId
      // We'll use a placeholder that we'll update later
      const tempDefinitionId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Serialize nodes and edges
      const nodesJson = JSON.stringify(validatedData.nodes || []);
      const edgesJson = JSON.stringify(validatedData.edges || []);

      // Create the workflow first
      const workflow = await tx.workflow.create({
        data: {
          teamId: validatedData.teamId,
          name: validatedData.name,
          description: validatedData.description,
          trigger: validatedData.trigger,
          definitionId: tempDefinitionId,
          createdBy: session.user.id,
        },
      });

      // Create initial workflow definition
      const initialDefinition = WorkflowParser.reconstructDefinition(
        validatedData.name,
        validatedData.description || undefined,
        validatedData.trigger,
        [],
        nodesJson,
        edgesJson,
      );

      // Create the definition with the actual workflow ID
      const definition = await tx.workflowDefinition.create({
        data: {
          workflowId: workflow.id,
          content: WorkflowParser.stringify(initialDefinition),
          format: 'json',
          nodes: nodesJson,
          edges: edgesJson,
          version: 1,
          createdBy: session.user.id,
        },
      });

      // Update workflow with the actual definition ID
      const updatedWorkflow = await tx.workflow.update({
        where: { id: workflow.id },
        data: { definitionId: definition.id },
      });

      return updatedWorkflow;
    });

    logger.info('Workflow created', {
      workflowId: result.id,
      teamId: validatedData.teamId,
      userId: session.user.id,
    });

    return NextResponse.json({
      data: {
        id: result.id,
        name: result.name,
        description: result.description,
        trigger: result.trigger,
        isPublished: result.isPublished,
        version: result.version,
        createdAt: result.createdAt,
      },
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create workflow', error instanceof Error ? error : undefined, {
      userId: session?.user?.id,
    });

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: error.message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create workflow' } },
      { status: 500 }
    );
  }
}