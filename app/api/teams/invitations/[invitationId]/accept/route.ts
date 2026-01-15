import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getPostHogClient } from "@/lib/posthog-server";

/**
 * POST /api/teams/invitations/[invitationId]/accept
 * Accept a team invitation
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { team: true },
    });

    if (!invitation) {
      return Response.json({ error: "Invitation not found" }, { status: 404 });
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
        where: { id: invitationId },
        data: { status: "EXPIRED" },
      });

      return Response.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Verify email matches
    if (invitation.email !== session.user.email) {
      return Response.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 }
      );
    }

    // Add user as team member
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: session.user.id,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" },
    });

    // Track team invitation accepted event in PostHog
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId: session.user.id,
      event: 'team_invitation_accepted',
      properties: {
        team_id: invitation.team.id,
        team_name: invitation.team.name,
        invitation_id: invitationId,
        role: invitation.role,
        source: 'api',
      },
    });

    // Identify the user with team information
    posthog.identify({
      distinctId: session.user.id,
      properties: {
        email: session.user.email,
        name: session.user.name,
      },
    });

    return Response.json(
      {
        success: true,
        message: `Successfully joined team "${invitation.team.name}"`,
        team: {
          id: invitation.team.id,
          name: invitation.team.name,
          slug: invitation.team.slug,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);

    // Check for unique constraint violation (already a member)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint failed")
    ) {
      return Response.json(
        { error: "You are already a member of this team" },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
