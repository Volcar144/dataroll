import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { WorkflowEngine } from '@/lib/workflows/engine';

// GET /api/workflows/[workflowId]/executions/[executionId] - Get execution details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string; executionId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workflowId, executionId } = await params;

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

    if (!workflow || workflow.team.members.length === 0) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId, workflowId },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: 'asc' },
        },
        approvals: {
          include: {
            approver: {
              select: { id: true, name: true, email: true, image: true },
            },
            approvals: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, image: true },
                },
              },
            },
          },
        },
        workflow: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    // Map nodeExecutions to handle the data transformation
    const mappedNodeExecutions = execution.nodeExecutions?.map(ne => ({
      ...ne,
      input: JSON.parse(ne.input || '{}'),
      output: ne.output ? JSON.parse(ne.output) : null,
    })) || [];

    return NextResponse.json({
      ...execution,
      context: JSON.parse(execution.context || '{}'),
      output: execution.output ? JSON.parse(execution.output) : null,
      nodeExecutions: mappedNodeExecutions,
    });
  } catch (error) {
    console.error('Error fetching workflow execution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow execution' },
      { status: 500 }
    );
  }
}

// POST /api/workflows/[workflowId]/executions/[executionId] - Retry or cancel execution
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string; executionId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { workflowId, executionId } = await params;
    const body = await request.json();
    const { action } = body;

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

    if (!workflow || workflow.team.members.length === 0) {
      return NextResponse.json(
        { error: 'Workflow not found or access denied' },
        { status: 404 }
      );
    }

    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId, workflowId },
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'retry':
        // Only allow retry on failed executions
        if (execution.status !== 'failed') {
          return NextResponse.json(
            { error: 'Can only retry failed executions' },
            { status: 400 }
          );
        }

        // Resume the workflow
        const resumeResult = await WorkflowEngine.resume(executionId);
        return NextResponse.json({
          success: resumeResult.success,
          status: resumeResult.status,
        });

      case 'cancel':
        // Only allow cancel on pending/running executions
        if (!['pending', 'running', 'awaiting_approval'].includes(execution.status)) {
          return NextResponse.json(
            { error: 'Can only cancel pending or running executions' },
            { status: 400 }
          );
        }

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: 'cancelled',
            completedAt: new Date(),
            error: JSON.stringify({ message: 'Cancelled by user', cancelledBy: session.user.id }),
          },
        });

        return NextResponse.json({ success: true, status: 'cancelled' });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "retry" or "cancel".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error handling execution action:', error);
    return NextResponse.json(
      { error: 'Failed to process execution action' },
      { status: 500 }
    );
  }
}
