import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// GET /api/workflows/[workflowId]/executions - Get workflow execution history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
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

    const { workflowId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

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

    const where = {
      workflowId,
      ...(status && { status }),
    };

    const [executions, totalCount] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        include: {
          nodeExecutions: {
            orderBy: { startedAt: 'asc' },
          },
        },
        orderBy: { triggeredAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    // Calculate stats
    const stats = await prisma.workflowExecution.groupBy({
      by: ['status'],
      where: { workflowId },
      _count: { status: true },
    });

    const statsMap = stats.reduce((acc, s) => {
      acc[s.status] = s._count.status;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      executions: executions.map(e => ({
        ...e,
        context: JSON.parse(e.context || '{}'),
        output: e.output ? JSON.parse(e.output) : null,
        nodeExecutions: e.nodeExecutions.map(ne => ({
          ...ne,
          input: JSON.parse(ne.input || '{}'),
          output: ne.output ? JSON.parse(ne.output) : null,
        })),
      })),
      totalCount,
      hasMore: offset + executions.length < totalCount,
      stats: {
        total: totalCount,
        pending: statsMap.pending || 0,
        running: statsMap.running || 0,
        success: statsMap.success || 0,
        failed: statsMap.failed || 0,
        cancelled: statsMap.cancelled || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching workflow executions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow executions' },
      { status: 500 }
    );
  }
}
