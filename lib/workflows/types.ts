import { z } from 'zod';

// Workflow Definition Schema
export const WorkflowVariableSchema = z.object({
  name: z.string().min(1),
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
  name: z.string().min(1),
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
    'custom_api_call',
    'database_query',
    'database_migration',
    'http_request',
    'shell_command',
    'set_variable',
    'transform_data'
  ]),
  connectionId: z.string().optional(),
  migrations: z.string().optional(), // Template string
  url: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  query: z.string().optional(),
  parameters: z.record(z.string(), z.any()).optional(),
  timeout: z.number().optional(),
  migrationId: z.string().optional(),
  command: z.string().optional(),
  variableName: z.string().optional(),
  value: z.any().optional(),
  input: z.any().optional(),
  transformFunction: z.string().optional(),
});

export const ConditionNodeDataSchema = z.object({
  condition: z.string(), // Condition expression like "user.age > 18" or "status === 'active'"
});

export const ApprovalNodeDataSchema = z.object({
  approvers: z.array(z.string()), // User IDs or template strings
  timeout: z.number().min(60).max(86400), // 1 minute to 24 hours
  skipIfCreator: z.boolean().default(false),
  requireAll: z.boolean().default(true),
  message: z.string().optional(),
});

export const NotificationNodeDataSchema = z.object({
  provider: z.enum(['slack', 'email', 'webhook', 'pagerduty', 'team_notification']),
  webhook: z.string().optional(), // Template string for webhook URL
  template: z.string().optional(), // Email subject or message template
  message: z.string().optional(), // Message content
  recipient: z.string().optional(), // Single recipient
  recipients: z.array(z.string()).optional(), // Multiple recipients
  subject: z.string().optional(), // Email subject
  channel: z.string().optional(), // Slack channel
  url: z.string().optional(), // Webhook URL
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(), // HTTP method
  headers: z.record(z.string(), z.string()).optional(), // HTTP headers
  body: z.string().optional(), // HTTP body
  teamId: z.string().optional(), // For team notifications
});

export const DelayNodeDataSchema = z.object({
  duration: z.number().min(1), // seconds
});

// Workflow execution types
export const WorkflowExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'failed',
  'cancelled'
]);

export const NodeExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'failed',
  'skipped'
]);

// Template variable resolution
export const TemplateContextSchema = z.object({
  currentUser: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().optional(),
    teamOwner: z.string().optional(),
  }),
  connectionId: z.string().optional(),
  variables: z.record(z.string(), z.any()),
  previousOutputs: z.record(z.string(), z.any()),
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

export type WorkflowExecutionStatus = z.infer<typeof WorkflowExecutionStatusSchema>;
export type NodeExecutionStatus = z.infer<typeof NodeExecutionStatusSchema>;
export type TemplateContext = z.infer<typeof TemplateContextSchema>;