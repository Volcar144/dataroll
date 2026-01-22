import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Permission, getRolePermissions } from '@/lib/permissions'
import { TeamRole } from '@prisma/client'

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: {
      findUnique: vi.fn(),
    },
  },
}))

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
})
