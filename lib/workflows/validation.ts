import { z } from 'zod';

// Workflow Definition Schema
export const WorkflowVariableSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'object', 'secret']),
  defaultValue: z.string().optional(),
  description: z.string().optional(),
  isSecret: z.boolean().default(false),
});

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['trigger', 'action', 'condition', 'approval', 'notification', 'delay']),
  label: z.string(),
  data: z.record(z.string(), z.any()), // Node-specific configuration
});

export const WorkflowEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export const WorkflowDefinitionSchema = z.object({
  version: z.string().default('1.0'),
  name: z.string(),
  description: z.string().optional(),
  trigger: z.enum(['manual', 'scheduled', 'webhook', 'event']),
  variables: z.array(WorkflowVariableSchema).default([]),
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
});

// Node-specific schemas
export const TriggerNodeDataSchema = z.object({
  description: z.string().optional(),
});

export const ActionNodeDataSchema = z.object({
  action: z.enum([
    'discover_migrations',
    'dry_run',
    'execute_migrations',
    'rollback',
    'run_tests',
    'custom_api_call'
  ]),
  connectionId: z.string().optional(),
  migrations: z.array(z.string()).optional(),
  url: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
});

export const ConditionNodeDataSchema = z.object({
  condition: z.string(), // JavaScript expression
  operator: z.enum(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']),
  value: z.any(),
});

export const ApprovalNodeDataSchema = z.object({
  approvers: z.array(z.string()), // User IDs
  timeout: z.number(), // seconds
  skipIfCreator: z.boolean().default(false),
  requireAll: z.boolean().default(true),
  message: z.string().optional(),
});

export const NotificationNodeDataSchema = z.object({
  provider: z.enum(['slack', 'email', 'webhook', 'pagerduty']),
  webhook: z.string().optional(),
  template: z.string().optional(),
  message: z.string().optional(),
  recipients: z.array(z.string()).optional(),
});

export const DelayNodeDataSchema = z.object({
  duration: z.number(), // seconds
});

// Workflow Execution schemas
export const WorkflowExecutionContextSchema = z.record(z.string(), z.any());

export const NodeExecutionResultSchema = z.object({
  success: z.boolean(),
  output: z.any().optional(),
  error: z.string().optional(),
  duration: z.number().optional(),
});

// API schemas
export const CreateWorkflowSchema = z.object({
  teamId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  trigger: z.enum(['manual', 'scheduled', 'webhook', 'event']),
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    position: z.object({
      x: z.number(),
      y: z.number(),
    }).optional(),
    data: z.record(z.string(), z.any()),
  })).optional(),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  })).optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  trigger: z.enum(['manual', 'scheduled', 'webhook', 'event']).optional(),
  tags: z.array(z.string()).optional(),
});

export const ExecuteWorkflowSchema = z.object({
  context: WorkflowExecutionContextSchema.optional(),
  variables: z.record(z.string(), z.any()).optional(),
  delaySeconds: z.number().optional(),
});

export const CreateWorkflowTriggerSchema = z.object({
  type: z.enum(['manual', 'scheduled', 'webhook', 'event']),
  config: z.record(z.string(), z.any()),
});

// Type exports
export type WorkflowVariable = z.infer<typeof WorkflowVariableSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;

export type TriggerNodeData = z.infer<typeof TriggerNodeDataSchema>;
export type ActionNodeData = z.infer<typeof ActionNodeDataSchema>;
export type ConditionNodeData = z.infer<typeof ConditionNodeDataSchema>;
export type ApprovalNodeData = z.infer<typeof ApprovalNodeDataSchema>;
export type NotificationNodeData = z.infer<typeof NotificationNodeDataSchema>;
export type DelayNodeData = z.infer<typeof DelayNodeDataSchema>;

export type WorkflowExecutionContext = z.infer<typeof WorkflowExecutionContextSchema>;
export type NodeExecutionResult = z.infer<typeof NodeExecutionResultSchema>;

export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowSchema>;
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowSchema>;
export type ExecuteWorkflowRequest = z.infer<typeof ExecuteWorkflowSchema>;
export type CreateWorkflowTriggerRequest = z.infer<typeof CreateWorkflowTriggerSchema>;