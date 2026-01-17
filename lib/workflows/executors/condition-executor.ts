import { NodeExecutor, ExecutionContext, NodeExecutionResult, ValidationResult } from '../engine';
import { ConditionNodeData } from '../types';

export class ConditionExecutor implements NodeExecutor {
  async execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeData = node.data as ConditionNodeData;

    try {
      // Evaluate the condition expression
      const result = this.evaluateCondition(nodeData, context, previousOutput);

      return {
        success: true,
        output: {
          condition: nodeData.condition,
          result,
          evaluatedAt: new Date().toISOString(),
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
    const nodeData = node.data as ConditionNodeData;
    const errors: string[] = [];

    if (!nodeData.condition) {
      errors.push('Condition expression is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private evaluateCondition(
    nodeData: ConditionNodeData,
    context: ExecutionContext,
    previousOutput: any
  ): boolean {
    try {
      // Create a safe evaluation context without using eval
      const evalContext = {
        ...context.variables,
        ...context.previousOutputs,
        previousOutput,
        context,
      };

      // Parse the condition expression safely
      const condition = nodeData.condition.trim();

      // Only allow simple comparisons and property access
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*\s*[=!<>]+\s*(.+)$/.test(condition)) {
        throw new Error(`Unsupported condition format: ${condition}. Use simple property comparisons.`);
      }

      // Extract the left side (property path) and operator/value
      const match = condition.match(/^([a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*([=!<>]+)\s*(.+)$/);
      if (!match) {
        throw new Error(`Invalid condition format: ${condition}`);
      }

      const [, propertyPath, , operator, valueStr] = match;

      // Get the left value safely
      const leftValue = this.getPropertyValue(evalContext, propertyPath);

      // Parse the right value
      let rightValue: any = valueStr.trim();

      // Try to parse as JSON, otherwise keep as string
      try {
        rightValue = JSON.parse(valueStr.trim());
      } catch {
        // Keep as string if not valid JSON
      }

      // Apply the operator
      switch (operator) {
        case '===':
        case '==':
          return leftValue === rightValue;
        case '!==':
        case '!=':
          return leftValue !== rightValue;
        case '>':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue > rightValue;
        case '<':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue < rightValue;
        case '>=':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue >= rightValue;
        case '<=':
          return typeof leftValue === 'number' && typeof rightValue === 'number' && leftValue <= rightValue;
        default:
          throw new Error(`Unsupported operator: ${operator}`);
      }
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  private getPropertyValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => {
      return current && current[prop] !== undefined ? current[prop] : undefined;
    }, obj);
  }
}