import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; invitationId: string }> }
) {
  const { teamId, invitationId } = await params;
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user is admin/owner
    const membership = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: teamId,
          userId: session.user.id
        }
      }
    });

    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.teamId !== teamId) {
      return NextResponse.json(
        { success: false, message: 'Invitation not found' },
        { status: 404 }
      );
    }

    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED' }
    });

    return NextResponse.json({ success: true, message: 'Invitation cancelled successfully' });
  } catch (error) {
    console.error('Failed to cancel invitation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
