import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/teams/invitations/accept/[token]
 * Accept a team invitation using token
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invitation = await prisma.teamInvitation.findFirst({
      where: { token },
      include: { team: true },
    });

    if (!invitation) {
      return Response.json({ error: "Invalid invitation token" }, { status: 404 });
    }

    // Check if invitation is still valid
    if (invitation.status !== "PENDING") {
      return Response.json(
        { error: `Invitation has already been ${invitation.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.teamInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return Response.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: invitation.teamId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return Response.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }

    // Check if user exists with the invited email
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.email !== invitation.email) {
      return Response.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Add user to team
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: session.user.id,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await prisma.teamInvitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    // Log the event
    const posthog = getPostHogClient();
    if (posthog) {
      posthog.capture({
        distinctId: session.user.id,
        event: "team_invitation_accepted",
        properties: {
          team_id: invitation.teamId,
          team_name: invitation.team.name,
          role: invitation.role,
        },
      });
    }

    return Response.json({
      success: true,
      message: `Successfully joined ${invitation.team.name}`,
      team: {
        id: invitation.team.id,
        name: invitation.team.name,
        role: invitation.role,
      },
    });
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}