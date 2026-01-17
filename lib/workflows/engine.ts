import { prisma } from '@/lib/prisma';
import { WorkflowParser } from './parser';
import { VariableEngine } from './variable-engine';
import { WorkflowExecutionStatus, NodeExecutionStatus, TemplateContext } from './types';
import { ActionExecutor } from './executors/action-executor';
import { ConditionExecutor } from './executors/condition-executor';
import { ApprovalExecutor } from './executors/approval-executor';
import { NotificationExecutor } from './executors/notification-executor';
import { DelayExecutor } from './executors/delay-executor';

export interface NodeExecutor {
  execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult>;

  validate(node: any): ValidationResult;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  currentUser: { id: string; email: string; name?: string };
  variables: Record<string, any>;
  previousOutputs: Record<string, any>;
  connectionId?: string;
  teamId: string;
}

export interface NodeExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class WorkflowEngine {
  private static executors: Map<string, NodeExecutor> = new Map();

  static {
    // Register node executors
    this.executors.set('action', new ActionExecutor());
    this.executors.set('condition', new ConditionExecutor());
    this.executors.set('approval', new ApprovalExecutor());
    this.executors.set('notification', new NotificationExecutor());
    this.executors.set('delay', new DelayExecutor());
  }

  /**
   * Execute a workflow
   */
  static async execute(
    workflowId: string,
    context: Partial<ExecutionContext>,
    triggeredBy: string
  ): Promise<{ executionId: string; status: WorkflowExecutionStatus }> {
    try {
      // Get workflow first
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Get workflow with definition
      const workflowWithDefinition = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          definitions: {
            where: { id: workflow.definitionId }
          },
          variables: true,
          team: true
        }
      });

      if (!workflowWithDefinition) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const definition = workflowWithDefinition.definitions[0];
      if (!definition) {
        throw new Error(`Workflow definition not found: ${workflow.definitionId}`);
      }

      if (!workflow.isPublished) {
        throw new Error(`Workflow is not published: ${workflowId}`);
      }

      // Parse workflow definition
      const parsedDefinition = WorkflowParser.parse(definition.content, definition.format as 'json' | 'yaml');

      // Create execution record
      const execution = await prisma.workflowExecution.create({
        data: {
          workflowId,
          triggeredBy,
          status: 'running',
          context: JSON.stringify(context.variables || {}),
        }
      });

      // Start execution asynchronously
      this.executeAsync(execution.id, workflowWithDefinition, parsedDefinition, context as ExecutionContext)
        .catch(error => {
          console.error(`Workflow execution failed: ${execution.id}`, error);
          this.updateExecutionStatus(execution.id, 'failed', error.message);
        });

      return {
        executionId: execution.id,
        status: 'running'
      };

    } catch (error) {
      console.error('Failed to start workflow execution:', error);
      throw error;
    }
  }

  /**
   * Execute workflow asynchronously
   */
  private static async executeAsync(
    executionId: string,
    workflow: any,
    definition: any,
    context: ExecutionContext
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Get execution order
      const executionOrder = WorkflowParser.getExecutionOrder(definition.nodes, definition.edges);

      // Prepare variable context
      const variableContext: TemplateContext = VariableEngine.createContext(
        context.currentUser,
        context.variables,
        {},
        { connectionId: context.connectionId }
      );

      // Execute nodes in order
      const nodeOutputs: Record<string, any> = {};

      for (const node of executionOrder) {
        const nodeStartTime = Date.now();

        try {
          // Create node execution record
          const nodeExecution = await prisma.nodeExecution.create({
            data: {
              executionId,
              nodeId: node.id,
              nodeType: node.type,
              nodeName: node.label,
              status: 'running',
              input: JSON.stringify(VariableEngine.resolveObject(node.data, variableContext)),
            }
          });

          // Get executor for node type
          const executor = this.executors.get(node.type);
          if (!executor) {
            throw new Error(`No executor found for node type: ${node.type}`);
          }

          // Execute node
          const result = await executor.execute(
            VariableEngine.resolveObject(node, variableContext),
            context,
            nodeOutputs
          );

          // Update node execution record
          await prisma.nodeExecution.update({
            where: { id: nodeExecution.id },
            data: {
              status: result.success ? 'success' : 'failed',
              output: JSON.stringify(result.output),
              error: result.error,
              duration: Date.now() - nodeStartTime,
              completedAt: new Date(),
            }
          });

          // Store output for next nodes
          if (result.success) {
            nodeOutputs[node.id] = result.output;
            variableContext.previousOutputs = nodeOutputs;
          } else {
            // Handle failure - could trigger error handling nodes
            nodeOutputs[node.id] = { error: result.error, success: false };
          }

        } catch (error) {
          console.error(`Node execution failed: ${node.id}`, error);

          // Update node execution with error
          await prisma.nodeExecution.updateMany({
            where: {
              executionId,
              nodeId: node.id,
              status: 'running'
            },
            data: {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              duration: Date.now() - nodeStartTime,
              completedAt: new Date(),
            }
          });

          // Mark workflow as failed
          await this.updateExecutionStatus(executionId, 'failed', `Node ${node.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }
      }

      // Mark workflow as successful
      await this.updateExecutionStatus(executionId, 'success', undefined, nodeOutputs);

    } catch (error) {
      console.error(`Workflow execution failed: ${executionId}`, error);
      await this.updateExecutionStatus(executionId, 'failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Update execution status
   */
  private static async updateExecutionStatus(
    executionId: string,
    status: WorkflowExecutionStatus,
    error?: string,
    output?: any
  ): Promise<void> {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status,
        completedAt: new Date(),
        error,
        output: output ? JSON.stringify(output) : undefined,
      }
    });
  }

  /**
   * Get execution status
   */
  static async getStatus(executionId: string): Promise<any> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        nodeExecutions: {
          orderBy: { startedAt: 'asc' }
        },
        workflow: {
          select: { name: true, teamId: true }
        }
      }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    return {
      id: execution.id,
      workflowName: execution.workflow.name,
      status: execution.status,
      triggeredAt: execution.triggeredAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      error: execution.error,
      nodes: execution.nodeExecutions.map(ne => ({
        id: ne.nodeId,
        name: ne.nodeName,
        type: ne.nodeType,
        status: ne.status,
        startedAt: ne.startedAt,
        completedAt: ne.completedAt,
        duration: ne.duration,
        error: ne.error,
      }))
    };
  }

  /**
   * Cancel execution
   */
  static async cancel(executionId: string): Promise<void> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId }
    });

    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status === 'running') {
      await this.updateExecutionStatus(executionId, 'cancelled');
    }
  }

  /**
   * Get execution history
   */
  static async getHistory(
    workflowId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<any[]> {
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      include: {
        _count: {
          select: { nodeExecutions: true }
        }
      },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
      skip: offset
    });

    return executions.map(exec => ({
      id: exec.id,
      status: exec.status,
      triggeredBy: exec.triggeredBy,
      triggeredAt: exec.triggeredAt,
      startedAt: exec.startedAt,
      completedAt: exec.completedAt,
      error: exec.error,
      nodeCount: exec._count.nodeExecutions,
    }));
  }

  /**
   * Test workflow execution with sample data
   */
  static async test(
    workflowId: string,
    testData: { variables?: Record<string, any>; connectionId?: string },
    user: { id: string; email: string; name?: string }
  ): Promise<any> {
    // Similar to execute but with test flag and limited execution
    const context: ExecutionContext = {
      workflowId,
      executionId: `test-${Date.now()}`,
      currentUser: user,
      variables: testData.variables || {},
      previousOutputs: {},
      connectionId: testData.connectionId,
      teamId: '', // Would need to be passed in
    };

    // Get workflow definition
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        definitions: {
          where: { id: { not: undefined } },
          take: 1
        },
        variables: true
      }
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const definition = workflow.definitions[0];
    if (!definition) {
      throw new Error(`Workflow definition not found: ${workflowId}`);
    }

    // Parse and validate
    const parsedDefinition = WorkflowParser.parse(definition.content, definition.format as 'json' | 'yaml');

    // Execute first few nodes for testing
    const executionOrder = WorkflowParser.getExecutionOrder(parsedDefinition.nodes, parsedDefinition.edges);
    const testNodes = executionOrder.slice(0, 3); // Test first 3 nodes

    const results: any[] = [];

    for (const node of testNodes) {
      try {
        const executor = this.executors.get(node.type);
        if (!executor) {
          results.push({
            nodeId: node.id,
            nodeName: node.label,
            success: false,
            error: `No executor for node type: ${node.type}`
          });
          continue;
        }

        const result = await executor.execute(
          VariableEngine.resolveObject(node, VariableEngine.createContext(user, testData.variables || {})),
          context,
          {}
        );

        results.push({
          nodeId: node.id,
          nodeName: node.label,
          success: result.success,
          output: result.output,
          error: result.error,
          duration: result.duration
        });

      } catch (error) {
        results.push({
          nodeId: node.id,
          nodeName: node.label,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      workflowId,
      testResults: results,
      totalNodes: executionOrder.length,
      testedNodes: testNodes.length
    };
  }
}