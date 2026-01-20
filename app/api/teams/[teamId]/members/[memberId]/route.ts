import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await params;
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user is admin/owner
    const requesterMembership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: teamId,
          userId: session.user.id
        }
      }
    });

    if (!requesterMembership || !['OWNER', 'ADMIN'].includes(requesterMembership.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Get the member to be removed
    const memberToRemove = await prisma.teamMember.findUnique({
      where: { id: memberId },
      include: { team: true }
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { success: false, message: 'Member not found' },
        { status: 404 }
      );
    }

    // Cannot remove the team owner
    if (memberToRemove.team.createdById === memberToRemove.userId) {
      return NextResponse.json(
        { success: false, message: 'Cannot remove the team owner' },
        { status: 400 }
      );
    }

    await prisma.teamMember.delete({
      where: { id: memberId }
    });

    return NextResponse.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
