import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  Permission,
  getRolePermissions,
  getUserPermissionsInTeam,
  userHasPermission,
  getUserRoleInTeam,
  isTeamOwner,
  isTeamMember,
  requirePermission,
  canManageUserRole,
} from '@/lib/permissions'
import { TeamRole } from '@prisma/client'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('Permissions', () => {
  describe('Permission enum', () => {
    it('should have all expected permissions', () => {
      expect(Permission.INVITE_MEMBERS).toBe('invite_members')
      expect(Permission.CREATE_CONNECTION).toBe('create_connection')
      expect(Permission.EXECUTE_MIGRATION).toBe('execute_migration')
      expect(Permission.VIEW_AUDIT_LOGS).toBe('view_audit_logs')
    })
  })

  describe('getRolePermissions', () => {
    it('should grant all permissions to OWNER role', () => {
      const permissions = getRolePermissions(TeamRole.OWNER)
      expect(permissions).toContain(Permission.DELETE_TEAM)
      expect(permissions).toContain(Permission.MANAGE_ROLES)
      expect(permissions).toContain(Permission.EXECUTE_MIGRATION)
      expect(permissions.length).toBeGreaterThan(20) // OWNER has all permissions
    })

    it('should grant admin permissions to ADMIN role', () => {
      const permissions = getRolePermissions(TeamRole.ADMIN)
      expect(permissions).toContain(Permission.INVITE_MEMBERS)
      expect(permissions).toContain(Permission.EXECUTE_MIGRATION)
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS)
    })

    it('should restrict ADMIN from owner-only permissions', () => {
      const permissions = getRolePermissions(TeamRole.ADMIN)
      expect(permissions).not.toContain(Permission.DELETE_TEAM)
    })

    it('should grant developer permissions to DEVELOPER role', () => {
      const permissions = getRolePermissions(TeamRole.DEVELOPER)
      expect(permissions).toContain(Permission.CREATE_MIGRATION)
      expect(permissions).toContain(Permission.EXECUTE_MIGRATION)
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS)
    })

    it('should restrict DEVELOPER from admin permissions', () => {
      const permissions = getRolePermissions(TeamRole.DEVELOPER)
      expect(permissions).not.toContain(Permission.INVITE_MEMBERS)
      expect(permissions).not.toContain(Permission.DELETE_CONNECTION)
    })

    it('should grant only view permissions to VIEWER role', () => {
      const permissions = getRolePermissions(TeamRole.VIEWER)
      expect(permissions).toContain(Permission.VIEW_CONNECTION_DETAILS)
      expect(permissions).toContain(Permission.VIEW_MIGRATION_DETAILS)
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS)
    })

    it('should restrict VIEWER from write operations', () => {
      const permissions = getRolePermissions(TeamRole.VIEWER)
      expect(permissions).not.toContain(Permission.CREATE_MIGRATION)
      expect(permissions).not.toContain(Permission.EXECUTE_MIGRATION)
      expect(permissions).not.toContain(Permission.DELETE_CONNECTION)
    })

    it('should grant member permissions to MEMBER role', () => {
      const permissions = getRolePermissions(TeamRole.MEMBER)
      expect(permissions).toContain(Permission.CREATE_CONNECTION)
      expect(permissions).toContain(Permission.EXECUTE_MIGRATION)
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS)
    })

    it('should restrict MEMBER from management permissions', () => {
      const permissions = getRolePermissions(TeamRole.MEMBER)
      expect(permissions).not.toContain(Permission.INVITE_MEMBERS)
      expect(permissions).not.toContain(Permission.DELETE_TEAM)
    })
  })

  describe('Role hierarchy', () => {
    it('OWNER should have more permissions than ADMIN', () => {
      const ownerPermissions = getRolePermissions(TeamRole.OWNER).length
      const adminPermissions = getRolePermissions(TeamRole.ADMIN).length

      expect(ownerPermissions).toBeGreaterThan(adminPermissions)
    })

    it('ADMIN should have more permissions than DEVELOPER', () => {
      const adminPermissions = getRolePermissions(TeamRole.ADMIN).length
      const devPermissions = getRolePermissions(TeamRole.DEVELOPER).length

      expect(adminPermissions).toBeGreaterThan(devPermissions)
    })

    it('VIEWER should have fewest permissions', () => {
      const viewerPermissions = getRolePermissions(TeamRole.VIEWER).length
      const memberPermissions = getRolePermissions(TeamRole.MEMBER).length

      expect(viewerPermissions).toBeLessThan(memberPermissions)
    })
  })

  describe('getUserPermissionsInTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return permissions for user in team', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.ADMIN,
      } as any)

      const permissions = await getUserPermissionsInTeam('user-123', 'team-456')

      expect(permissions).toContain(Permission.INVITE_MEMBERS)
      expect(permissions).toContain(Permission.VIEW_AUDIT_LOGS)
    })

    it('should return empty array when user not in team', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)

      const permissions = await getUserPermissionsInTeam('user-123', 'team-456')

      expect(permissions).toEqual([])
    })
  })

  describe('userHasPermission', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return true when user has permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.ADMIN,
      } as any)

      const result = await userHasPermission('user-123', 'team-456', Permission.INVITE_MEMBERS)

      expect(result).toBe(true)
    })

    it('should return false when user lacks permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.VIEWER,
      } as any)

      const result = await userHasPermission('user-123', 'team-456', Permission.CREATE_MIGRATION)

      expect(result).toBe(false)
    })

    it('should return false when user not in team', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)

      const result = await userHasPermission('user-123', 'team-456', Permission.VIEW_AUDIT_LOGS)

      expect(result).toBe(false)
    })
  })

  describe('getUserRoleInTeam', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return user role in team', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.DEVELOPER,
      } as any)

      const role = await getUserRoleInTeam('user-123', 'team-456')

      expect(role).toBe(TeamRole.DEVELOPER)
    })

    it('should return null when user not in team', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)

      const role = await getUserRoleInTeam('user-123', 'team-456')

      expect(role).toBeNull()
    })
  })

  describe('isTeamOwner', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return true for OWNER', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.OWNER,
      } as any)

      const result = await isTeamOwner('user-123', 'team-456')

      expect(result).toBe(true)
    })

    it('should return true for ADMIN', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.ADMIN,
      } as any)

      const result = await isTeamOwner('user-123', 'team-456')

      expect(result).toBe(true)
    })

    it('should return false for DEVELOPER', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.DEVELOPER,
      } as any)

      const result = await isTeamOwner('user-123', 'team-456')

      expect(result).toBe(false)
    })

    it('should return false for non-member', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)

      const result = await isTeamOwner('user-123', 'team-456')

      expect(result).toBe(false)
    })
  })

  describe('isTeamMember', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return true when user is a member', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.VIEWER,
      } as any)

      const result = await isTeamMember('user-123', 'team-456')

      expect(result).toBe(true)
    })

    it('should return false when user is not a member', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null)

      const result = await isTeamMember('user-123', 'team-456')

      expect(result).toBe(false)
    })
  })

  describe('requirePermission', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should not throw when user has permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.ADMIN,
      } as any)

      await expect(
        requirePermission('user-123', 'team-456', Permission.INVITE_MEMBERS)
      ).resolves.not.toThrow()
    })

    it('should throw when user lacks permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.VIEWER,
      } as any)

      await expect(
        requirePermission('user-123', 'team-456', Permission.CREATE_MIGRATION)
      ).rejects.toThrow('does not have create_migration permission')
    })
  })

  describe('canManageUserRole', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should return false when managing own role', async () => {
      const result = await canManageUserRole('user-123', 'team-456', 'user-123')

      expect(result).toBe(false)
    })

    it('should return true when user has MANAGE_ROLES permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.ADMIN,
      } as any)

      const result = await canManageUserRole('admin-123', 'team-456', 'user-789')

      expect(result).toBe(true)
    })

    it('should return false when user lacks MANAGE_ROLES permission', async () => {
      vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
        role: TeamRole.DEVELOPER,
      } as any)

      const result = await canManageUserRole('dev-123', 'team-456', 'user-789')

      expect(result).toBe(false)
    })
  })
})
