import { prisma } from "@/lib/prisma";
import { TeamRole } from "@prisma/client";

export enum Permission {
  // Team management
  INVITE_MEMBERS = "invite_members",
  REMOVE_MEMBERS = "remove_members",
  UPDATE_TEAM = "update_team",
  DELETE_TEAM = "delete_team",
  MANAGE_ROLES = "manage_roles",

  // Database connections
  CREATE_CONNECTION = "create_connection",
  UPDATE_CONNECTION = "update_connection",
  DELETE_CONNECTION = "delete_connection",
  VIEW_CONNECTION_DETAILS = "view_connection_details",
  TEST_CONNECTION = "test_connection",

  // Migrations
  CREATE_MIGRATION = "create_migration",
  EXECUTE_MIGRATION = "execute_migration",
  ROLLBACK_MIGRATION = "rollback_migration",
  SCHEDULE_MIGRATION = "schedule_migration",
  VIEW_MIGRATION_DETAILS = "view_migration_details",
  APPROVE_MIGRATION = "approve_migration",

  // Audit logs
  VIEW_AUDIT_LOGS = "view_audit_logs",
  EXPORT_AUDIT_LOGS = "export_audit_logs",

  // Webhooks
  CREATE_WEBHOOK = "create_webhook",
  UPDATE_WEBHOOK = "update_webhook",
  DELETE_WEBHOOK = "delete_webhook",

  // Settings
  MANAGE_SETTINGS = "manage_settings",
}

// Define role-based permissions
const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  OWNER: Object.values(Permission),
  ADMIN: [
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.UPDATE_TEAM,
    Permission.MANAGE_ROLES,
    Permission.CREATE_CONNECTION,
    Permission.UPDATE_CONNECTION,
    Permission.DELETE_CONNECTION,
    Permission.VIEW_CONNECTION_DETAILS,
    Permission.TEST_CONNECTION,
    Permission.CREATE_MIGRATION,
    Permission.EXECUTE_MIGRATION,
    Permission.ROLLBACK_MIGRATION,
    Permission.SCHEDULE_MIGRATION,
    Permission.VIEW_MIGRATION_DETAILS,
    Permission.APPROVE_MIGRATION,
    Permission.VIEW_AUDIT_LOGS,
    Permission.CREATE_WEBHOOK,
    Permission.UPDATE_WEBHOOK,
    Permission.DELETE_WEBHOOK,
    Permission.MANAGE_SETTINGS,
  ],
  DEVELOPER: [
    Permission.CREATE_CONNECTION,
    Permission.VIEW_CONNECTION_DETAILS,
    Permission.TEST_CONNECTION,
    Permission.CREATE_MIGRATION,
    Permission.EXECUTE_MIGRATION,
    Permission.SCHEDULE_MIGRATION,
    Permission.VIEW_MIGRATION_DETAILS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  VIEWER: [
    Permission.VIEW_CONNECTION_DETAILS,
    Permission.VIEW_MIGRATION_DETAILS,
    Permission.VIEW_AUDIT_LOGS,
  ],
};

/**
 * Get all permissions for a user in a team
 */
export async function getUserPermissionsInTeam(
  userId: string,
  teamId: string
): Promise<Permission[]> {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  if (!member) {
    return [];
  }

  return ROLE_PERMISSIONS[member.role] || [];
}

/**
 * Check if a user has a specific permission in a team
 */
export async function userHasPermission(
  userId: string,
  teamId: string,
  permission: Permission
): Promise<boolean> {
  const permissions = await getUserPermissionsInTeam(userId, teamId);
  return permissions.includes(permission);
}

/**
 * Get the role of a user in a team
 */
export async function getUserRoleInTeam(
  userId: string,
  teamId: string
): Promise<TeamRole | null> {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  return member?.role || null;
}

/**
 * Check if a user is a team owner (has OWNER or ADMIN role)
 */
export async function isTeamOwner(userId: string, teamId: string): Promise<boolean> {
  const role = await getUserRoleInTeam(userId, teamId);
  return role === "OWNER" || role === "ADMIN";
}

/**
 * Check if a user is a member of a team
 */
export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const member = await prisma.teamMember.findUnique({
    where: {
      teamId_userId: {
        teamId,
        userId,
      },
    },
  });

  return !!member;
}

/**
 * Verify user has permission, throw error if not
 */
export async function requirePermission(
  userId: string,
  teamId: string,
  permission: Permission
): Promise<void> {
  const hasPermission = await userHasPermission(userId, teamId, permission);

  if (!hasPermission) {
    throw new Error(
      `User ${userId} does not have ${permission} permission in team ${teamId}`
    );
  }
}

/**
 * Get the permissions a specific role has
 */
export function getRolePermissions(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user can manage another user's role in a team
 */
export async function canManageUserRole(
  userId: string,
  teamId: string,
  targetUserId: string
): Promise<boolean> {
  // Can't manage your own role
  if (userId === targetUserId) {
    return false;
  }

  // Must have manage_roles permission
  return userHasPermission(userId, teamId, Permission.MANAGE_ROLES);
}
