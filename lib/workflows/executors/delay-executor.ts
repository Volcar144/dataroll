import { NodeExecutor, ExecutionContext, NodeExecutionResult, ValidationResult } from '../engine';
import { DelayNodeData } from '../types';

export class DelayExecutor implements NodeExecutor {
  async execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeData = node.data as DelayNodeData;

    try {
      const delayMs = nodeData.duration * 1000; // Convert seconds to milliseconds

      // For actual delay, we'd use setTimeout or a job queue
      // For now, just simulate the delay
      if (delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      return {
        success: true,
        output: {
          duration: nodeData.duration,
          delayMs,
          executedAt: new Date().toISOString(),
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
    const nodeData = node.data as DelayNodeData;
    const errors: string[] = [];

    if (!nodeData.duration || nodeData.duration < 1) {
      errors.push('Delay duration must be at least 1 second');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}