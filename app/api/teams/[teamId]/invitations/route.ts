import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission, Permission } from "@/lib/permissions";
import { headers } from "next/headers";
import crypto from "crypto";

/**
 * POST /api/teams/[teamId]/invitations
 * Send a team invitation to a new member
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check permission to invite members
    await requirePermission(session.user.id, teamId, Permission.INVITE_MEMBERS);

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return Response.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["ADMIN", "DEVELOPER", "VIEWER"];
    if (!validRoles.includes(role)) {
      return Response.json(
        { error: "Invalid role. Must be ADMIN, DEVELOPER, or VIEWER" },
        { status: 400 }
      );
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team) {
      return Response.json({ error: "Team not found" }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return Response.json(
        { error: "User is already a member of this team" },
        { status: 409 }
      );
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        email,
        status: "PENDING",
      },
    });

    if (existingInvitation) {
      return Response.json(
        { error: "An invitation already exists for this email" },
        { status: 409 }
      );
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString("hex");

    // Create invitation
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        email,
        role,
        invitedById: session.user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // TODO: Send invitation email with link containing token

    return Response.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error creating invitation:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/teams/[teamId]/invitations
 * Get pending invitations for a team
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check permission to invite members (implies can view invitations)
    await requirePermission(session.user.id, teamId, Permission.INVITE_MEMBERS);

    const invitations = await prisma.teamInvitation.findMany({
      where: {
        teamId,
        status: "PENDING",
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json({ invitations });
  } catch (error) {
    if (error instanceof Error && error.message.includes("does not have")) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("Error fetching invitations:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
