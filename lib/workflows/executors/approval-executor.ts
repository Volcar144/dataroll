import { NodeExecutor, ExecutionContext, NodeExecutionResult, ValidationResult } from '../engine';
import { ApprovalNodeData } from '../types';
import { prisma } from '@/lib/prisma';

export class ApprovalExecutor implements NodeExecutor {
  async execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeData = node.data as ApprovalNodeData;

    try {
      // Create approval request
      const approval = await prisma.workflowApproval.create({
        data: {
          workflowId: context.workflowId,
          executionId: context.executionId,
          nodeId: node.id,
          nodeName: node.label,
          approvers: nodeData.approvers,
          approvalType: nodeData.requireAll ? 'unanimous' : 'any',
          requiredApprovals: nodeData.requireAll ? nodeData.approvers.length : 1,
          timeoutMinutes: Math.floor(nodeData.timeout / 60), // Convert seconds to minutes
          message: nodeData.message,
          context: JSON.stringify({
            previousOutput,
            variables: context.variables,
            currentUser: context.currentUser,
          }),
          status: 'PENDING',
        }
      });

      // Pause the workflow execution
      await prisma.workflowExecution.update({
        where: { id: context.executionId },
        data: { status: 'paused' }
      });

      return {
        success: true,
        output: {
          approvalId: approval.id,
          status: 'PENDING',
          approvers: nodeData.approvers,
          requiredApprovals: nodeData.requireAll ? nodeData.approvers.length : 1,
          message: nodeData.message,
        },
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: any): ValidationResult {
    const nodeData = node.data as ApprovalNodeData;
    const errors: string[] = [];

    if (!nodeData.approvers || nodeData.approvers.length === 0) {
      errors.push('At least one approver is required');
    }

    if (nodeData.timeout < 60) {
      errors.push('Timeout must be at least 60 seconds (1 minute)');
    }

    if (nodeData.timeout > 86400) {
      errors.push('Timeout cannot exceed 24 hours (86400 seconds)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Approve an approval request
   */
  static async approve(
    approvalId: string,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const approval = await prisma.workflowApproval.findUnique({
        where: { id: approvalId },
        include: { approvals: true }
      });

      if (!approval) {
        return { success: false, message: 'Approval request not found' };
      }

      if (approval.status !== 'PENDING') {
        return { success: false, message: `Approval is already ${approval.status}` };
      }

      // Check if user is an approver
      if (!approval.approvers.includes(userId)) {
        return { success: false, message: 'User is not authorized to approve this request' };
      }

      // Check if user already responded
      const existingResponse = await prisma.approvalResponse.findFirst({
        where: { approvalId, userId }
      });
      if (existingResponse) {
        return { success: false, message: 'User has already responded to this request' };
      }

      // Add approval
      await prisma.approvalResponse.create({
        data: {
          approvalId,
          userId,
          decision: 'approved',
          comment,
        }
      });

      // Check if approval threshold is met
      const responseCount = await prisma.approvalResponse.count({
        where: { approvalId, decision: 'approved' }
      });
      
      const isApproved = approval.approvalType === 'unanimous' 
        ? responseCount >= approval.approvers.length
        : responseCount >= 1;

      if (isApproved) {
        await prisma.workflowApproval.update({
          where: { id: approvalId },
          data: { 
            status: 'APPROVED',
            approvedBy: userId,
            approvedAt: new Date()
          }
        });

        // Resume workflow execution
        const { WorkflowEngine } = await import('../engine');
        await WorkflowEngine.resume(approval.executionId);

        return {
          success: true,
          message: 'Approval granted and workflow resumed'
        };
      }

      return {
        success: true,
        message: isApproved ? 'Approval granted' : 'Approval recorded'
      };

    } catch (error) {
      console.error('Approval failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Reject an approval request
   */
  static async reject(
    approvalId: string,
    userId: string,
    comment?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const approval = await prisma.workflowApproval.findUnique({
        where: { id: approvalId }
      });

      if (!approval) {
        return { success: false, message: 'Approval request not found' };
      }

      if (approval.status !== 'PENDING') {
        return { success: false, message: `Approval is already ${approval.status}` };
      }

      // Check if user is an approver
      if (!approval.approvers.includes(userId)) {
        return { success: false, message: 'User is not authorized to approve this request' };
      }

      // Add rejection
      await prisma.approvalResponse.create({
        data: {
          approvalId,
          userId,
          decision: 'REJECTED',
          comment,
        }
      });

      // Mark as rejected
      await prisma.workflowApproval.update({
        where: { id: approvalId },
        data: { status: 'REJECTED' }
      });

      // Fail the workflow execution on rejection
      const { WorkflowEngine } = await import('../engine');
      await WorkflowEngine.updateExecutionStatus(approval.executionId, 'failed', `Approval rejected by ${userId}${comment ? `: ${comment}` : ''}`);

      return { success: true, message: 'Approval rejected and workflow failed' };

    } catch (error) {
      console.error('Rejection failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get pending approvals for a user
   */
  static async getPendingApprovals(userId: string): Promise<any[]> {
    const approvals = await prisma.workflowApproval.findMany({
      where: {
        approvers: { has: userId },
        status: 'PENDING'
      },
      include: {
        workflow: {
          select: { name: true, teamId: true }
        },
        approvals: {
          include: {
            user: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return approvals.map(approval => ({
      id: approval.id,
      workflowName: approval.workflow.name,
      nodeName: approval.nodeName,
      message: approval.message,
      approvalType: approval.approvalType,
      requiredApprovals: approval.requiredApprovals,
      currentApprovals: approval.approvals.filter(a => a.decision === 'approved').length,
      totalApprovers: approval.approvers.length,
      createdAt: approval.createdAt,
      timeoutMinutes: approval.timeoutMinutes,
    }));
  }

  private static async autoApprove(approvalId: string, userId: string): Promise<void> {
    // Auto-approve for development/testing
    await prisma.approvalResponse.create({
      data: {
        approvalId,
        userId,
        decision: 'approved',
        comment: 'Auto-approved for testing',
      }
    });

    await prisma.workflowApproval.update({
      where: { id: approvalId },
      data: { status: 'APPROVED' }
    });
  }
}