import { TemplateContext } from './types';

export class VariableEngine {
  /**
   * Resolve template variables in a string
   * Supports syntax like: {{ variableName }}, {{ variableName.property }}, {{ currentUser.email }}
   */
  static resolve(template: string, context: TemplateContext): string {
    if (!template || typeof template !== 'string') {
      return template;
    }

    return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), context);
      } catch (error) {
        console.warn(`Failed to resolve template expression "${expression}":`, error);
        return match; // Return original template if resolution fails
      }
    });
  }

  /**
   * Resolve template variables in an object recursively
   */
  static resolveObject(obj: any, context: TemplateContext): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.resolve(obj, context);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.resolveObject(item, context));
    }

    if (typeof obj === 'object') {
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        resolved[key] = this.resolveObject(value, context);
      }
      return resolved;
    }

    return obj;
  }

  /**
   * Evaluate a template expression
   */
  private static evaluateExpression(expression: string, context: TemplateContext): string {
    const parts = expression.split('.');

    if (parts.length === 0) {
      return '';
    }

    const [root, ...path] = parts;

    let value: any;

    // Handle special context variables
    switch (root) {
      case 'currentUser':
        value = context.currentUser;
        break;
      case 'variables':
        value = context.variables;
        break;
      case 'previousOutputs':
        value = context.previousOutputs;
        break;
      default:
        // Check if it's a workflow variable
        if (context.variables && context.variables[root] !== undefined) {
          value = context.variables[root];
        } else {
          throw new Error(`Unknown variable: ${root}`);
        }
    }

    // Navigate through the path
    for (const part of path) {
      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'object' && value !== null) {
        value = value[part];
      } else {
        throw new Error(`Cannot access property "${part}" of ${typeof value}`);
      }
    }

    // Convert to string
    if (value === null || value === undefined) {
      return '';
    }

    return String(value);
  }

  /**
   * Extract all template variables from a string
   */
  static extractVariables(template: string): string[] {
    if (!template || typeof template !== 'string') {
      return [];
    }

    const matches = template.match(/\{\{\s*([^}]+)\s*\}\}/g);
    if (!matches) {
      return [];
    }

    const variables: string[] = [];
    for (const match of matches) {
      const expression = match.slice(2, -2).trim();
      const root = expression.split('.')[0];
      if (!variables.includes(root)) {
        variables.push(root);
      }
    }

    return variables;
  }

  /**
   * Validate that all template variables in a definition are defined
   */
  static validateVariables(definition: any, definedVariables: string[] = []): { valid: boolean; missing: string[] } {
    const usedVariables = new Set<string>();

    const extractFromValue = (value: any) => {
      if (typeof value === 'string') {
        const vars = this.extractVariables(value);
        vars.forEach(v => usedVariables.add(v));
      } else if (Array.isArray(value)) {
        value.forEach(extractFromValue);
      } else if (typeof value === 'object' && value !== null) {
        Object.values(value).forEach(extractFromValue);
      }
    };

    // Extract from nodes
    if (definition.nodes) {
      definition.nodes.forEach((node: any) => {
        extractFromValue(node.data);
      });
    }

    // Check against defined variables
    const allDefined = new Set([
      ...definedVariables,
      'currentUser',
      'variables',
      'previousOutputs'
    ]);

    const missing: string[] = [];
    for (const used of usedVariables) {
      if (!allDefined.has(used)) {
        missing.push(used);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Create a template context from workflow execution data
   */
  static createContext(
    currentUser: { id: string; email: string; name?: string },
    workflowVariables: Record<string, any> = {},
    previousOutputs: Record<string, any> = {},
    additionalContext: Record<string, any> = {}
  ): TemplateContext {
    // Get team owner if available (this would need to be passed in)
    const teamOwner = additionalContext.teamOwner;

    return {
      currentUser: {
        ...currentUser,
        teamOwner
      },
      variables: workflowVariables,
      previousOutputs,
      ...additionalContext
    };
  }
}