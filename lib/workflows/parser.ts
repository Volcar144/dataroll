import { z } from 'zod';
import yaml from 'js-yaml';
import {
  WorkflowDefinitionSchema,
  WorkflowDefinition,
  WorkflowVariable,
  WorkflowNode,
  WorkflowEdge,
  type TemplateContext
} from './types';

export class WorkflowParser {
  /**
   * Parse workflow definition from content string
   */
  static parse(content: string, format: 'json' | 'yaml' = 'json'): WorkflowDefinition {
    try {
      let parsed: any;

      if (format === 'yaml') {
        parsed = yaml.load(content);
      } else {
        parsed = JSON.parse(content);
      }

      // Validate against schema
      const validated = WorkflowDefinitionSchema.parse(parsed);

      // Additional validation
      this.validateWorkflowStructure(validated);

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
        throw new Error(`Workflow validation failed: ${errorMessages.join(', ')}`);
      }
      throw new Error(`Failed to parse workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stringify workflow definition to content string
   */
  static stringify(definition: WorkflowDefinition, format: 'json' | 'yaml' = 'json'): string {
    try {
      if (format === 'yaml') {
        return yaml.dump(definition);
      } else {
        return JSON.stringify(definition, null, 2);
      }
    } catch (error) {
      throw new Error(`Failed to stringify workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate workflow structure and logic
   */
  static validateWorkflowStructure(definition: WorkflowDefinition): void {
    const errors: string[] = [];

    // Check for duplicate node IDs
    const nodeIds = new Set<string>();
    for (const node of definition.nodes) {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    }

    // Check for valid edge references
    const nodeIdSet = new Set(definition.nodes.map(n => n.id));
    for (const edge of definition.edges) {
      if (!nodeIdSet.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIdSet.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    // Check for trigger nodes
    const triggerNodes = definition.nodes.filter(n => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      errors.push('Workflow must have at least one trigger node');
    }

    // Check for cycles (basic detection)
    if (this.hasCycles(definition.nodes, definition.edges)) {
      errors.push('Workflow contains cycles which are not allowed');
    }

    // Validate node-specific requirements
    for (const node of definition.nodes) {
      const nodeErrors = this.validateNode(node);
      errors.push(...nodeErrors);
    }

    if (errors.length > 0) {
      throw new Error(`Workflow validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Validate individual node configuration
   */
  private static validateNode(node: WorkflowNode): string[] {
    const errors: string[] = [];

    switch (node.type) {
      case 'trigger':
        // Trigger nodes don't need special validation
        break;

      case 'action':
        if (!node.data.action) {
          errors.push(`Action node ${node.id} missing action type`);
        }
        break;

      case 'condition':
        // Validation is handled by ConditionExecutor
        break;

      case 'approval':
        // Validation is handled by ApprovalExecutor
        break;

      case 'notification':
        // Validation is handled by NotificationExecutor
        break;

      case 'delay':
        // Validation is handled by DelayExecutor
        break;
    }

    return errors;
  }

  /**
   * Detect cycles in workflow graph
   */
  private static hasCycles(nodes: WorkflowNode[], edges: WorkflowEdge[]): boolean {
    const adjacencyList = new Map<string, string[]>();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    // Build adjacency list
    for (const edge of edges) {
      if (!adjacencyList.has(edge.source)) {
        adjacencyList.set(edge.source, []);
      }
      adjacencyList.get(edge.source)!.push(edge.target);
    }

    // DFS to detect cycles
    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor) && dfs(neighbor)) {
          return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id) && dfs(node.id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Extract variables used in templates
   */
  static extractTemplateVariables(definition: WorkflowDefinition): Set<string> {
    const variables = new Set<string>();

    const extractFromString = (str: string) => {
      const matches = str.match(/\{\{\s*([^}]+)\s*\}\}/g);
      if (matches) {
        for (const match of matches) {
          const varName = match.slice(2, -2).trim().split('.')[0];
          variables.add(varName);
        }
      }
    };

    // Check node data
    for (const node of definition.nodes) {
      for (const [key, value] of Object.entries(node.data)) {
        if (typeof value === 'string') {
          extractFromString(value);
        }
      }
    }

    return variables;
  }

  /**
   * Get execution order of nodes (topological sort)
   */
  static getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowNode[] {
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    const nodeMap = new Map<string, WorkflowNode>();

    // Initialize
    for (const node of nodes) {
      nodeMap.set(node.id, node);
      inDegree.set(node.id, 0);
      adjacencyList.set(node.id, []);
    }

    // Build graph
    for (const edge of edges) {
      adjacencyList.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }

    // Kahn's algorithm
    const queue: string[] = [];
    const result: WorkflowNode[] = [];

    // Start with nodes that have no incoming edges (trigger nodes)
    for (const [nodeId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      result.push(nodeMap.get(nodeId)!);

      for (const neighbor of adjacencyList.get(nodeId) || []) {
        inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      }
    }

    // Check if all nodes were processed (no cycles)
    if (result.length !== nodes.length) {
      throw new Error('Workflow contains cycles or unreachable nodes');
    }

    return result;
  }

  /**
   * Validate workflow definition
   */
  static validate(definition: any): { valid: boolean; errors: string[] } {
    try {
      WorkflowDefinitionSchema.parse(definition);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.issues.map(err => `${err.path.join('.')}: ${err.message}`);
        return { valid: false, errors };
      }
      return { valid: false, errors: [error instanceof Error ? error.message : 'Unknown validation error'] };
    }
  }

  /**
   * Extract nodes and edges from workflow definition for storage
   */
  static extractNodesAndEdges(definition: WorkflowDefinition): { nodes: string; edges: string } {
    return {
      nodes: JSON.stringify(definition.nodes),
      edges: JSON.stringify(definition.edges),
    };
  }

  /**
   * Reconstruct full definition from stored components
   */
  static reconstructDefinition(
    name: string,
    description: string | undefined,
    trigger: string,
    variables: any[],
    nodesJson: string,
    edgesJson: string,
    version: string = '1.0'
  ): WorkflowDefinition {
    const nodes = JSON.parse(nodesJson);
    const edges = JSON.parse(edgesJson);

    return {
      version,
      name,
      description,
      trigger: trigger as any,
      variables,
      nodes,
      edges,
    };
  }
}