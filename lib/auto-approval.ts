import { prisma } from '@/lib/prisma';

export interface AutoApprovalRule {
  id: string;
  userId: string;
  connectionId?: string | null;
  teamId?: string | null;
  queryPattern?: string | null;
  maxRows?: number | null;
  isActive: boolean;
}

export class AutoApprovalService {
  async checkAutoApproval(
    userId: string,
    connectionId: string,
    query: string,
    estimatedRows?: number
  ): Promise<boolean> {
    try {
      // Get all active auto-approval rules for the user
      const rules = await prisma.autoApprovalRule.findMany({
        where: {
          userId,
          isActive: true,
          OR: [
            { connectionId }, // Specific connection rules
            { connectionId: null, teamId: null }, // Global user rules
            {
              teamId: {
                in: await this.getUserTeamIds(userId)
              }
            } // Team rules
          ]
        },
      });

      // Check each rule
      for (const rule of rules) {
        if (this.matchesRule(rule, connectionId, query, estimatedRows)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking auto-approval:', error);
      return false;
    }
  }

  private async getUserTeamIds(userId: string): Promise<string[]> {
    const teamMembers = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return teamMembers.map(tm => tm.teamId);
  }

  private matchesRule(
    rule: { connectionId: string | null; queryPattern: string | null; maxRows: number | null },
    connectionId: string,
    query: string,
    estimatedRows?: number
  ): boolean {
    // Check connection-specific rules
    if (rule.connectionId != null && rule.connectionId !== connectionId) {
      return false;
    }

    // Check query pattern if specified
    if (rule.queryPattern) {
      try {
        const regex = new RegExp(rule.queryPattern, 'i');
        if (!regex.test(query)) {
          return false;
        }
      } catch (error) {
        console.error('Invalid regex pattern in auto-approval rule:', rule.queryPattern);
        return false;
      }
    }

    // Check max rows if specified
    if (rule.maxRows != null && estimatedRows !== undefined) {
      if (estimatedRows > rule.maxRows) {
        return false;
      }
    }

    // If we get here, all conditions are met
    return true;
  }

  async createRule(rule: Omit<AutoApprovalRule, 'id' | 'isActive'>): Promise<AutoApprovalRule> {
    const created = await prisma.autoApprovalRule.create({
      data: {
        ...rule,
        isActive: true,
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      connectionId: created.connectionId || undefined,
      teamId: created.teamId || undefined,
      queryPattern: created.queryPattern || undefined,
      maxRows: created.maxRows || undefined,
      isActive: created.isActive,
    };
  }

  async updateRule(id: string, updates: Partial<Omit<AutoApprovalRule, 'id'>>): Promise<AutoApprovalRule | null> {
    try {
      const updated = await prisma.autoApprovalRule.update({
        where: { id },
        data: updates,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        connectionId: updated.connectionId || undefined,
        teamId: updated.teamId || undefined,
        queryPattern: updated.queryPattern || undefined,
        maxRows: updated.maxRows || undefined,
        isActive: updated.isActive,
      };
    } catch (error) {
      console.error('Error updating auto-approval rule:', error);
      return null;
    }
  }

  async deleteRule(id: string): Promise<boolean> {
    try {
      await prisma.autoApprovalRule.delete({
        where: { id },
      });
      return true;
    } catch (error) {
      console.error('Error deleting auto-approval rule:', error);
      return false;
    }
  }

  async getUserRules(userId: string): Promise<AutoApprovalRule[]> {
    const rules = await prisma.autoApprovalRule.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rules.map(rule => ({
      id: rule.id,
      userId: rule.userId,
      connectionId: rule.connectionId || undefined,
      teamId: rule.teamId || undefined,
      queryPattern: rule.queryPattern || undefined,
      maxRows: rule.maxRows || undefined,
      isActive: rule.isActive,
    }));
  }
}