Implement Workflow System with Visual Node Editor
Build a comprehensive workflow system for dataroll that allows users to create custom migration workflows using a visual node-based editor, with workflows stored as YAML/JSON for versioning and automation.

Workflow System Overview
A powerful workflow engine that enables users to automate complex database migration scenarios beyond simple apply/rollback. Examples:

Migrate schema → run data transformation → verify results → notify team
Check migration prerequisites → require approval → execute → rollback on failure
Multi-environment workflows: dev → staging → production with approvals
Part 1: Data Models & Database Schema
New Prisma Models
model Workflow {
  id String @id @default(cuid())
  teamId String
  name String
  description String? @db.Text
  
  // Workflow definition
  definition WorkflowDefinition @relation("WorkflowDefinition", fields: [definitionId], references: [id])
  definitionId String @unique
  
  // Versioning
  version Int @default(1)
  isPublished Boolean @default(false)
  publishedAt DateTime?
  
  // Metadata
  tags String[] @default([])
  trigger String // "manual", "scheduled", "webhook", "event"
  
  // Tracking
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  definitions WorkflowDefinition[] @relation("WorkflowDefinitions")
  executions WorkflowExecution[]
  triggers WorkflowTrigger[]
}

model WorkflowDefinition {
  id String @id @default(cuid())
  workflowId String
  
  // YAML/JSON storage
  content String @db.Text // Full workflow definition
  format String @default("json") // "json" or "yaml"
  
  // Metadata
  nodes String @db.Text // Serialized nodes array
  edges String @db.Text // Serialized edges array
  
  // Version control
  version Int
  changelog String? @db.Text
  
  createdAt DateTime @default(now())
  createdBy String
  
  workflow Workflow @relation("WorkflowDefinition", fields: [id], references: [definitionId])
  workflows Workflow[] @relation("WorkflowDefinitions", fields: [workflowId], references: [id])
}

model WorkflowExecution {
  id String @id @default(cuid())
  workflowId String
  
  // Execution state
  status String // "pending", "running", "success", "failed", "cancelled"
  
  // Triggers
  triggeredBy String // userId or "schedule" or "webhook"
  triggeredAt DateTime @default(now())
  startedAt DateTime?
  completedAt DateTime?
  
  // Execution data
  context String @db.Text // Input variables/context
  output String? @db.Text // Final output
  error String? @db.Text // Error details
  
  // Tracking
  nodeExecutions NodeExecution[]
  audit AuditLog[]
  
  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

model NodeExecution {
  id String @id @default(cuid())
  executionId String
  
  // Node identification
  nodeId String
  nodeType String // "trigger", "action", "condition", "approval", "notification", etc
  nodeName String
  
  // Execution state
  status String // "pending", "running", "success", "failed", "skipped"
  
  // Data flow
  input String @db.Text // Input to this node
  output String? @db.Text // Output from this node
  error String? @db.Text // Error if failed
  
  // Timing
  startedAt DateTime?
  completedAt DateTime?
  duration Int? // milliseconds
  
  // Retry info
  retryCount Int @default(0)
  retryable Boolean @default(false)
  
  execution WorkflowExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)
}

model WorkflowTrigger {
  id String @id @default(cuid())
  workflowId String
  
  // Trigger configuration
  type String // "manual", "scheduled", "webhook", "on_event"
  config String @db.Text // Trigger-specific config (cron, event filter, webhook key, etc)
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  workflow Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

model WorkflowVariable {
  id String @id @default(cuid())
  workflowId String
  
  name String
  type String // "string", "number", "boolean", "object", "secret"
  defaultValue String? @db.Text
  description String? @db.Text
  isSecret Boolean @default(false)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([workflowId, name])
}
Part 2: Workflow Definition Schema (YAML/JSON)
JSON Structure
{
  "version": "1.0",
  "name": "Safe Production Migration",
  "description": "Multi-step production migration with approvals",
  "trigger": "manual",
  "variables": [
    {
      "name": "targetEnv",
      "type": "string",
      "default": "production",
      "description": "Target environment"
    },
    {
      "name": "slackWebhook",
      "type": "secret",
      "description": "Slack webhook for notifications"
    }
  ],
  "nodes": [
    {
      "id": "trigger-1",
      "type": "trigger",
      "label": "Manual Trigger",
      "data": {
        "description": "User manually starts workflow"
      }
    },
    {
      "id": "discover-1",
      "type": "action",
      "label": "Discover Migrations",
      "data": {
        "action": "discover_migrations",
        "connectionId": "{{ connectionId }}",
        "ormType": "auto"
      }
    },
    {
      "id": "filter-1",
      "type": "condition",
      "label": "Any Pending?",
      "data": {
        "condition": "{{ discover-1.output.migrations.length > 0 }}",
        "operator": "equals",
        "value": true
      }
    },
    {
      "id": "dryrun-1",
      "type": "action",
      "label": "Dry-Run Migrations",
      "data": {
        "action": "dry_run",
        "connectionId": "{{ connectionId }}",
        "migrations": "{{ discover-1.output.migrations }}"
      }
    },
    {
      "id": "approval-1",
      "type": "approval",
      "label": "Require Approval",
      "data": {
        "approvers": ["{{ currentUser.teamOwner }}"],
        "timeout": 3600,
        "skipIfCreator": false,
        "requireAll": true
      }
    },
    {
      "id": "execute-1",
      "type": "action",
      "label": "Execute Migrations",
      "data": {
        "action": "execute_migrations",
        "connectionId": "{{ connectionId }}",
        "migrations": "{{ discover-1.output.migrations }}"
      }
    },
    {
      "id": "notify-1",
      "type": "notification",
      "label": "Slack Notification",
      "data": {
        "provider": "slack",
        "webhook": "{{ slackWebhook }}",
        "template": "migration_success",
        "message": "Migrations applied successfully to {{ targetEnv }}"
      }
    },
    {
      "id": "error-handler-1",
      "type": "action",
      "label": "Rollback on Failure",
      "data": {
        "action": "rollback",
        "connectionId": "{{ connectionId }}"
      }
    }
  ],
  "edges": [
    { "source": "trigger-1", "target": "discover-1" },
    { "source": "discover-1", "target": "filter-1" },
    { "source": "filter-1", "target": "dryrun-1", "label": "Yes" },
    { "source": "dryrun-1", "target": "approval-1" },
    { "source": "approval-1", "target": "execute-1", "label": "Approved" },
    { "source": "execute-1", "target": "notify-1" },
    { "source": "execute-1", "target": "error-handler-1", "label": "Failed" }
  ]
}
YAML Equivalent
version: '1.0'
name: Safe Production Migration
description: Multi-step production migration with approvals
trigger: manual

variables:
  targetEnv:
    type: string
    default: production
    description: Target environment
  slackWebhook:
    type: secret
    description: Slack webhook for notifications

nodes:
  trigger-1:
    type: trigger
    label: Manual Trigger
    description: User manually starts workflow

  discover-1:
    type: action
    label: Discover Migrations
    action: discover_migrations
    connectionId: "{{ connectionId }}"
    ormType: auto

  filter-1:
    type: condition
    label: Any Pending?
    condition: "{{ discover-1.output.migrations.length > 0 }}"
    operator: equals
    value: true

  dryrun-1:
    type: action
    label: Dry-Run Migrations
    action: dry_run
    connectionId: "{{ connectionId }}"
    migrations: "{{ discover-1.output.migrations }}"

  approval-1:
    type: approval
    label: Require Approval
    approvers:
      - "{{ currentUser.teamOwner }}"
    timeout: 3600
    skipIfCreator: false
    requireAll: true

  execute-1:
    type: action
    label: Execute Migrations
    action: execute_migrations
    connectionId: "{{ connectionId }}"
    migrations: "{{ discover-1.output.migrations }}"

  notify-1:
    type: notification
    label: Slack Notification
    provider: slack
    webhook: "{{ slackWebhook }}"
    template: migration_success
    message: "Migrations applied successfully to {{ targetEnv }}"

  error-handler-1:
    type: action
    label: Rollback on Failure
    action: rollback
    connectionId: "{{ connectionId }}"

edges:
  - source: trigger-1
    target: discover-1
  - source: discover-1
    target: filter-1
  - source: filter-1
    target: dryrun-1
    label: "Yes"
  - source: dryrun-1
    target: approval-1
  - source: approval-1
    target: execute-1
    label: "Approved"
  - source: execute-1
    target: notify-1
  - source: execute-1
    target: error-handler-1
    label: "Failed"
Part 3: Visual Workflow Editor (Frontend)
Dependencies
reactflow or react-flow-renderer - Node/edge visual editing
zustand - State management for workflow
react-hot-toast - Toast notifications
react-query - API data fetching
js-yaml - YAML parsing/stringify
zod - Workflow validation
Pages/Components
1. Workflow List (app/dashboard/workflows/page.tsx)

List all workflows with status
Create new workflow button
Edit, duplicate, delete actions
Publish/unpublish toggle
Search and filter
2. Workflow Editor (app/dashboard/workflows/[id]/editor/page.tsx)

Left Panel: Node Palette

Draggable node types (trigger, action, condition, approval, notification, delay, error handler)
Search node types
Node descriptions
Center: Canvas (using ReactFlow)

Drag-and-drop nodes
Connect nodes with edges
Pan and zoom
Delete nodes/edges
Node configuration panel on select
Right Panel: Node Inspector

Selected node configuration
Input/output schema
Variable suggestions
Test node button
Bottom: Definition View

Toggle between visual and YAML/JSON
Syntax highlighting
Format validation
Edit raw definition
Top: Actions

Save draft
Publish workflow
Test workflow (with sample data)
View execution history
3. Node Configuration Modals

Each node type needs a config panel:

Trigger Nodes

Manual: No config
Scheduled: Cron expression, timezone
Webhook: Webhook path, secret key
Event: Event type, filters
Action Nodes

Discover Migrations: Connection ID, ORM type
Dry-Run: Connection ID, migration selection
Execute: Connection ID, migration selection
Rollback: Connection ID
Delay: Duration (seconds, minutes, hours)
Custom API Call: URL, method, headers, body
Condition Nodes

Simple: Variable comparison (==, !=, <, >, <=, >=)
Complex: JavaScript expression evaluation
Variable selection with auto-complete
Approval Nodes

Approver selection (specific users, roles)
Timeout duration
Notifications
Skip if creator
Require all approvals or any
Notification Nodes

Provider: Slack, Email, PagerDuty, Webhook
Template selection
Custom message
Recipient configuration
State Management (Zustand Store)
interface WorkflowStore {
  nodes: Node[]
  edges: Edge[]
  selectedNode: Node | null
  variables: WorkflowVariable[]
  definition: WorkflowDefinition
  
  // Actions
  addNode: (node: Node) => void
  removeNode: (id: string) => void
  updateNode: (id: string, data: any) => void
  addEdge: (edge: Edge) => void
  removeEdge: (id: string) => void
  setSelectedNode: (node: Node | null) => void
  addVariable: (variable: WorkflowVariable) => void
  loadDefinition: (def: WorkflowDefinition) => void
  saveDefinition: () => Promise<void>
  publishWorkflow: () => Promise<void>
  testWorkflow: (input: any) => Promise<void>
}
Part 4: Workflow Engine (Backend)
Workflow Execution Engine (lib/workflows/engine.ts)
export class WorkflowEngine {
  // Execute workflow
  static async execute(
    workflowId: string,
    context: Record<string, any>,
    triggeredBy: string
  ): Promise<WorkflowExecution>
  
  // Get workflow status
  static async getStatus(executionId: string): Promise<ExecutionStatus>
  
  // Cancel execution
  static async cancel(executionId: string): Promise<void>
  
  // Get execution history
  static async getHistory(
    workflowId: string,
    limit: number,
    offset: number
  ): Promise<WorkflowExecution[]>
}
Node Executors (lib/workflows/executors/)
Each node type has its own executor:

// Base executor
export interface NodeExecutor {
  execute(
    node: Node,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult>
  
  validate(node: Node): ValidationResult
}

// Example: ActionExecutor
export class ActionExecutor implements NodeExecutor {
  async execute(node, context, previousOutput) {
    const action = node.data.action
    
    switch(action) {
      case "discover_migrations":
        return await this.discoverMigrations(node, context)
      case "dry_run":
        return await this.dryRun(node, context)
      case "execute_migrations":
        return await this.executeMigrations(node, context)
      case "rollback":
        return await this.rollback(node, context)
      // ...
    }
  }
}

// Example: ApprovalExecutor
export class ApprovalExecutor implements NodeExecutor {
  async execute(node, context, previousOutput) {
    // Create approval request
    // Wait for approval or timeout
    // Return approval decision
  }
}

// Example: NotificationExecutor
export class NotificationExecutor implements NodeExecutor {
  async execute(node, context, previousOutput) {
    const { provider, message } = node.data
    
    switch(provider) {
      case "slack":
        return await this.sendSlack(message, context)
      case "email":
        return await this.sendEmail(message, context)
      case "webhook":
        return await this.sendWebhook(message, context)
    }
  }
}
Variable & Template Engine
export class VariableEngine {
  // Resolve template variables
  static resolve(template: string, context: any): string
  
  // Example: "{{ discover-1.output.migrations }}" → actual data
  // Example: "{{ currentUser.email }}" → user's email
  // Example: "{{ variables.targetEnv }}" → variable value
}
Workflow Parser & Validator (lib/workflows/parser.ts)
export class WorkflowParser {
  // Parse YAML/JSON definition
  static parse(content: string, format: "json" | "yaml"): WorkflowDefinition
  
  // Stringify to YAML/JSON
  static stringify(definition: any, format: "json" | "yaml"): string
  
  // Validate definition
  static validate(definition: any): ValidationResult
}
Part 5: API Endpoints
Workflow Management
POST /api/workflows - Create workflow

{
  teamId: string
  name: string
  description?: string
  trigger: "manual" | "scheduled" | "webhook"
}
GET /api/workflows - List workflows

Query: teamId, status, trigger type
GET /api/workflows/[id] - Get workflow details

PATCH /api/workflows/[id] - Update workflow

Updates definition, publishes, etc.
DELETE /api/workflows/[id] - Delete workflow

POST /api/workflows/[id]/publish - Publish workflow

Locks current version as published
POST /api/workflows/[id]/test - Test workflow execution

{
  input: Record<string, any>
  dryRun?: boolean
}
Workflow Execution
POST /api/workflows/[id]/execute - Start execution

{
  context?: Record<string, any>
  variables?: Record<string, any>
  delaySeconds?: number
}
GET /api/executions/[id] - Get execution status

Returns current state, node execution details
GET /api/executions/[id]/logs - Get execution logs

Detailed logs for each node
POST /api/executions/[id]/cancel - Cancel execution

GET /api/workflows/[id]/executions - Execution history

Paginated list with filters
Triggers
POST /api/workflows/[id]/triggers - Create trigger

{
  type: "scheduled" | "webhook" | "event"
  config: Record<string, any>
}
GET /api/workflows/[id]/triggers - List triggers

PATCH /api/workflows/[id]/triggers/[triggerId] - Update trigger

DELETE /api/workflows/[id]/triggers/[triggerId] - Delete trigger

POST /api/webhooks/[key] - Webhook execution

Execute workflow via webhook call
Part 6: Triggers & Scheduling
Manual Trigger
User clicks "Execute Workflow" button
Pass input variables
Scheduled Trigger
Cron expression (e.g., "0 2 * * *" = 2 AM daily)
Timezone support
Uses node-cron or similar
Webhook Trigger
Generate unique webhook URL
Secret key for verification
Execute workflow on webhook call
Pass webhook payload as context
Event Trigger
Trigger on migration execution
Trigger on connection test
Trigger on deployment event
Filter by event type and metadata
Part 7: Approval System
Approval Request Nodes
Create approval request:

{
  workflowExecutionId: string
  nodeId: string
  approvers: string[]
  timeout: number
  message: string
  skipIfCreator: boolean
}
UI for Approvals (app/dashboard/approvals/page.tsx)

Pending approvals list
Approve/reject buttons
Comments on approval
Auto-expire old approvals
Approval Table in Prisma

model WorkflowApproval {
  id String @id @default(cuid())
  executionId String
  nodeId String
  
  status String // "pending", "approved", "rejected"
  approvers String[] // User IDs
  approvedBy String? // User ID who approved
  approvedAt DateTime?
  rejectionReason String? @db.Text
  
  timeout DateTime
  expiresAt DateTime?
  
  nodeExecution NodeExecution?
}
Part 8: Error Handling & Retry
Error Handling
Try-catch blocks in each executor
Fallback edges for failed nodes
Error logging to NodeExecution
Retry Logic
Configurable per node
Max retry count
Exponential backoff
Retry delay
Node Configuration
{
  retryable: boolean
  maxRetries: number
  retryDelay: number // seconds
  retryBackoff: "linear" | "exponential"
}
Part 9: Workflow Templates
Pre-built templates for common scenarios:

Simple Migration - Discover → Execute → Notify
Prod Safe - Discover → Dry-Run → Approval → Execute → Rollback on Fail
Multi-Env - Dev Execute → Staging Execute → Prod Approval → Prod Execute
Scheduled - Daily cron → Discover → Notify if pending
Approval Chain - Multiple approvers in sequence
Data Validation - Execute → Run tests → Notify results
API Endpoint:
GET /api/workflow-templates - List templates
POST /api/workflows/from-template/[templateId] - Create from template

Part 10: Monitoring & Observability
Execution Dashboard (app/dashboard/workflows/[id]/executions)
Execution timeline
Node execution status and timing
Variable flow visualization
Logs and error messages
Performance metrics
Metrics to Track
Total executions
Success rate
Average execution time
Node execution time
Approval SLA compliance
WebSocket Real-Time Updates
Live execution status
Node completion in real-time
Approval notifications
Log streaming
Implementation Plan
Phase 3.1: Core Foundation
Database models and schema
Workflow definition format (JSON/YAML)
Parser and validator
Basic API endpoints
Phase 3.2: Visual Editor
ReactFlow integration
Node palette
Node inspector panel
YAML/JSON toggle
Save/publish functionality
Phase 3.3: Execution Engine
Workflow executor
Node executors (action, condition, trigger)
Variable resolution engine
Basic execution API
Phase 3.4: Advanced Features
Approval system
Notification system
Error handling and retry
Scheduled/webhook triggers
Real-time updates via WebSocket
Phase 3.5: Polish & Monitoring
Execution history viewer
Metrics dashboard
Templates library
Documentation
Testing suite
Acceptance Criteria
✓ Workflow definition format (JSON/YAML) defined and validated
✓ Visual workflow editor with ReactFlow
✓ Node palette with all node types
✓ YAML/JSON definition viewer and editor
✓ Workflow saving and publishing
✓ Backend workflow execution engine
✓ All node executors implemented
✓ Variable and template resolution working
✓ Approval system functional
✓ Notification system (Slack, Email, Webhook)
✓ Scheduled and webhook triggers working
✓ Execution history and logs viewable
✓ Real-time execution status updates
✓ Error handling and retry logic
✓ Workflow templates available
✓ Comprehensive testing (unit + integration)
✓ Complete documentation and examples

Example Workflows Users Can Build
Daily Auto-Migration Check

Trigger: Daily at 2 AM
Discover pending migrations
If any → Send Slack notification
If critical → Create approval request
Staged Rollout

Trigger: Manual
Execute on Dev → Wait 1 hour → Execute on Staging → Get Approval → Execute on Prod
Deployment Pipeline

Trigger: GitHub webhook on push to main
Discover migrations
Dry-run
Run tests
If tests pass → Get approval → Execute
If tests fail → Notify team, don't execute
Weekly Audit

Trigger: Every Friday 6 PM
Check all connections
Generate migration report
Send to team via Email
Emergency Rollback

Trigger: Manual (for emergencies)
Rollback last N migrations
Require 2 approvals
Notify on completion