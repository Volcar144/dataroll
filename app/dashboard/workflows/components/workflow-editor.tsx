'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth-service'
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type NodeTypes,
  type EdgeTypes,
  reconnectEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Plus,
  Save,
  Trash2,
  Play,
  Settings,
  ArrowLeft,
  X,
  Database,
  GitBranch,
  Clock,
  Bell,
  CheckCircle,
  AlertCircle,
  Code,
  Globe,
  Terminal,
  RefreshCw,
  Search,
  Zap,
  ChevronRight,
  Info,
  FileText,
} from 'lucide-react'

// ============================================
// NODE TYPE DEFINITIONS
// ============================================

interface BaseNodeData {
  label: string
  description?: string
  [key: string]: any
}

// Node handle styles
const handleStyle = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: '2px solid white',
}

// ============================================
// CUSTOM NODE COMPONENTS
// ============================================

// Trigger Node - Start of workflow
const TriggerNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[180px] rounded-xl border-2 bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg transition-all ${
      selected ? 'ring-2 ring-blue-300 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#3b82f6' }}
    />
    <div className="flex items-center gap-2">
      <div className="rounded-lg bg-white/20 p-2">
        <Play className="h-4 w-4 text-white" />
      </div>
      <div>
        <div className="text-sm font-semibold text-white">{data.label}</div>
        <div className="text-xs text-blue-100">{data.triggerType || 'Manual'}</div>
      </div>
    </div>
  </div>
)

// Discover Migrations Node
const DiscoverMigrationsNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-purple-400 bg-gradient-to-br from-purple-50 to-purple-100 p-4 shadow-md transition-all dark:from-purple-900/30 dark:to-purple-800/30 ${
      selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#a855f7' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#a855f7' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-purple-500/20 p-2">
        <Search className="h-5 w-5 text-purple-600 dark:text-purple-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-purple-800 dark:text-purple-200">{data.label}</div>
        <div className="text-xs text-purple-600 dark:text-purple-400">Find pending migrations</div>
      </div>
    </div>
  </div>
)

// Dry Run Node
const DryRunNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-cyan-400 bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 shadow-md transition-all dark:from-cyan-900/30 dark:to-cyan-800/30 ${
      selected ? 'ring-2 ring-cyan-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#06b6d4' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#06b6d4' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-cyan-500/20 p-2">
        <FileText className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">{data.label}</div>
        <div className="text-xs text-cyan-600 dark:text-cyan-400">Test without applying</div>
      </div>
    </div>
  </div>
)

// Execute Migrations Node
const ExecuteMigrationsNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-green-400 bg-gradient-to-br from-green-50 to-green-100 p-4 shadow-md transition-all dark:from-green-900/30 dark:to-green-800/30 ${
      selected ? 'ring-2 ring-green-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#22c55e' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#22c55e' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-green-500/20 p-2">
        <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-green-800 dark:text-green-200">{data.label}</div>
        <div className="text-xs text-green-600 dark:text-green-400">Apply migrations</div>
      </div>
    </div>
  </div>
)

// Rollback Node
const RollbackNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-red-400 bg-gradient-to-br from-red-50 to-red-100 p-4 shadow-md transition-all dark:from-red-900/30 dark:to-red-800/30 ${
      selected ? 'ring-2 ring-red-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#ef4444' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#ef4444' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-red-500/20 p-2">
        <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-red-800 dark:text-red-200">{data.label}</div>
        <div className="text-xs text-red-600 dark:text-red-400">Revert migration</div>
      </div>
    </div>
  </div>
)

// Database Query Node
const DatabaseQueryNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-indigo-400 bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 shadow-md transition-all dark:from-indigo-900/30 dark:to-indigo-800/30 ${
      selected ? 'ring-2 ring-indigo-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#6366f1' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#6366f1' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-indigo-500/20 p-2">
        <Database className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">{data.label}</div>
        <div className="text-xs text-indigo-600 dark:text-indigo-400">Execute SQL query</div>
      </div>
    </div>
  </div>
)

// HTTP Request Node
const HttpRequestNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-orange-100 p-4 shadow-md transition-all dark:from-orange-900/30 dark:to-orange-800/30 ${
      selected ? 'ring-2 ring-orange-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#f97316' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#f97316' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-orange-500/20 p-2">
        <Globe className="h-5 w-5 text-orange-600 dark:text-orange-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-orange-800 dark:text-orange-200">{data.label}</div>
        <div className="text-xs text-orange-600 dark:text-orange-400">{data.method || 'GET'} Request</div>
      </div>
    </div>
  </div>
)

// Shell Command Node
const ShellCommandNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-slate-400 bg-gradient-to-br from-slate-50 to-slate-100 p-4 shadow-md transition-all dark:from-slate-900/30 dark:to-slate-800/30 ${
      selected ? 'ring-2 ring-slate-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#64748b' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#64748b' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-slate-500/20 p-2">
        <Terminal className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{data.label}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400">Run command</div>
      </div>
    </div>
  </div>
)

// Condition Node
const ConditionNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 shadow-md transition-all dark:from-yellow-900/30 dark:to-yellow-800/30 ${
      selected ? 'ring-2 ring-yellow-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#eab308' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="true"
      style={{ ...handleStyle, background: '#22c55e', left: '30%' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="false"
      style={{ ...handleStyle, background: '#ef4444', left: '70%' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-yellow-500/20 p-2">
        <GitBranch className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{data.label}</div>
        <div className="text-xs text-yellow-600 dark:text-yellow-400">Branch logic</div>
      </div>
    </div>
    <div className="mt-2 flex justify-between text-[10px] text-yellow-600 dark:text-yellow-400 px-2">
      <span>✓ True</span>
      <span>✗ False</span>
    </div>
  </div>
)

// Approval Node
const ApprovalNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 shadow-md transition-all dark:from-emerald-900/30 dark:to-emerald-800/30 ${
      selected ? 'ring-2 ring-emerald-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#10b981' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#10b981' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-emerald-500/20 p-2">
        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">{data.label}</div>
        <div className="text-xs text-emerald-600 dark:text-emerald-400">Require approval</div>
      </div>
    </div>
  </div>
)

// Notification Node
const NotificationNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-pink-400 bg-gradient-to-br from-pink-50 to-pink-100 p-4 shadow-md transition-all dark:from-pink-900/30 dark:to-pink-800/30 ${
      selected ? 'ring-2 ring-pink-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#ec4899' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#ec4899' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-pink-500/20 p-2">
        <Bell className="h-5 w-5 text-pink-600 dark:text-pink-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-pink-800 dark:text-pink-200">{data.label}</div>
        <div className="text-xs text-pink-600 dark:text-pink-400">{data.provider || 'Email'}</div>
      </div>
    </div>
  </div>
)

// Delay Node
const DelayNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 p-4 shadow-md transition-all dark:from-gray-900/30 dark:to-gray-800/30 ${
      selected ? 'ring-2 ring-gray-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#6b7280' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#6b7280' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-gray-500/20 p-2">
        <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{data.label}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">{data.duration || '0'}s delay</div>
      </div>
    </div>
  </div>
)

// Transform Data Node
const TransformDataNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 to-violet-100 p-4 shadow-md transition-all dark:from-violet-900/30 dark:to-violet-800/30 ${
      selected ? 'ring-2 ring-violet-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#8b5cf6' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#8b5cf6' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-violet-500/20 p-2">
        <Code className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-violet-800 dark:text-violet-200">{data.label}</div>
        <div className="text-xs text-violet-600 dark:text-violet-400">Transform data</div>
      </div>
    </div>
  </div>
)

// Set Variable Node
const SetVariableNode = ({ data, selected }: { data: BaseNodeData; selected: boolean }) => (
  <div
    className={`min-w-[200px] rounded-xl border-2 border-teal-400 bg-gradient-to-br from-teal-50 to-teal-100 p-4 shadow-md transition-all dark:from-teal-900/30 dark:to-teal-800/30 ${
      selected ? 'ring-2 ring-teal-400 ring-offset-2' : ''
    }`}
  >
    <Handle
      type="target"
      position={Position.Top}
      style={{ ...handleStyle, background: '#14b8a6' }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      style={{ ...handleStyle, background: '#14b8a6' }}
    />
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-teal-500/20 p-2">
        <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
      </div>
      <div>
        <div className="text-sm font-semibold text-teal-800 dark:text-teal-200">{data.label}</div>
        <div className="text-xs text-teal-600 dark:text-teal-400">Set variable</div>
      </div>
    </div>
  </div>
)

// ============================================
// NODE TYPES REGISTRY
// ============================================

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  discoverMigrations: DiscoverMigrationsNode,
  dryRun: DryRunNode,
  executeMigrations: ExecuteMigrationsNode,
  rollback: RollbackNode,
  databaseQuery: DatabaseQueryNode,
  httpRequest: HttpRequestNode,
  shellCommand: ShellCommandNode,
  condition: ConditionNode,
  approval: ApprovalNode,
  notification: NotificationNode,
  delay: DelayNode,
  transformData: TransformDataNode,
  setVariable: SetVariableNode,
}

// ============================================
// NODE PALETTE DEFINITIONS
// ============================================

interface NodePaletteItem {
  type: string
  label: string
  description: string
  icon: any
  color: string
  category: 'trigger' | 'database' | 'logic' | 'integration' | 'utility'
}

const nodePalette: NodePaletteItem[] = [
  // Triggers
  {
    type: 'trigger',
    label: 'Trigger',
    description: 'Start workflow execution',
    icon: Play,
    color: 'blue',
    category: 'trigger',
  },
  // Database Actions
  {
    type: 'discoverMigrations',
    label: 'Discover Migrations',
    description: 'Scan for pending migrations',
    icon: Search,
    color: 'purple',
    category: 'database',
  },
  {
    type: 'dryRun',
    label: 'Dry Run',
    description: 'Test migrations without applying',
    icon: FileText,
    color: 'cyan',
    category: 'database',
  },
  {
    type: 'executeMigrations',
    label: 'Execute Migrations',
    description: 'Apply pending migrations',
    icon: Play,
    color: 'green',
    category: 'database',
  },
  {
    type: 'rollback',
    label: 'Rollback',
    description: 'Revert migration changes',
    icon: RefreshCw,
    color: 'red',
    category: 'database',
  },
  {
    type: 'databaseQuery',
    label: 'Database Query',
    description: 'Execute custom SQL query',
    icon: Database,
    color: 'indigo',
    category: 'database',
  },
  // Logic
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on conditions',
    icon: GitBranch,
    color: 'yellow',
    category: 'logic',
  },
  {
    type: 'approval',
    label: 'Approval',
    description: 'Require manual approval',
    icon: CheckCircle,
    color: 'emerald',
    category: 'logic',
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Wait before continuing',
    icon: Clock,
    color: 'gray',
    category: 'logic',
  },
  // Integrations
  {
    type: 'httpRequest',
    label: 'HTTP Request',
    description: 'Make API calls',
    icon: Globe,
    color: 'orange',
    category: 'integration',
  },
  {
    type: 'notification',
    label: 'Notification',
    description: 'Send notifications',
    icon: Bell,
    color: 'pink',
    category: 'integration',
  },
  // Utility
  {
    type: 'shellCommand',
    label: 'Shell Command',
    description: 'Run shell commands',
    icon: Terminal,
    color: 'slate',
    category: 'utility',
  },
  {
    type: 'transformData',
    label: 'Transform Data',
    description: 'Transform workflow data',
    icon: Code,
    color: 'violet',
    category: 'utility',
  },
  {
    type: 'setVariable',
    label: 'Set Variable',
    description: 'Store data in variables',
    icon: Zap,
    color: 'teal',
    category: 'utility',
  },
]

const categories = [
  { id: 'trigger', label: 'Triggers', icon: Play },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'logic', label: 'Logic', icon: GitBranch },
  { id: 'integration', label: 'Integrations', icon: Globe },
  { id: 'utility', label: 'Utilities', icon: Settings },
]

// ============================================
// MAIN WORKFLOW EDITOR COMPONENT
// ============================================

interface WorkflowEditorProps {
  workflowId?: string
  initialNodes?: Node[]
  initialEdges?: Edge[]
  initialName?: string
  initialDescription?: string
  initialTrigger?: string
  initialTeamId?: string
}

interface Team {
  id: string
  name: string
  slug: string
}

interface DatabaseConnection {
  id: string
  name: string
  type: string
  host: string
  database: string
}

interface TeamMember {
  id: string
  user: {
    id: string
    name: string | null
    email: string
  }
  role: string
}

export default function WorkflowEditor({
  workflowId,
  initialNodes = [],
  initialEdges = [],
  initialName = 'New Workflow',
  initialDescription = '',
  initialTrigger = 'manual',
  initialTeamId,
}: WorkflowEditorProps) {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  // State
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges)
  const [workflowName, setWorkflowName] = useState(initialName)
  const [workflowDescription, setWorkflowDescription] = useState(initialDescription)
  const [trigger, setTrigger] = useState(initialTrigger)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodePanel, setShowNodePanel] = useState(true)
  const [expandedCategory, setExpandedCategory] = useState<string | null>('database')
  
  // Team and connection state
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(initialTeamId || null)
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Auth check
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin')
    } else if (!isPending) {
      setLoading(false)
    }
  }, [session, isPending, router])

  // Fetch teams
  useEffect(() => {
    if (session) {
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeams(data.data || [])
            if (!currentTeamId && data.data?.length > 0) {
              setCurrentTeamId(data.data[0].id)
            }
          }
        })
        .catch(console.error)
    }
  }, [session])

  // Fetch connections and team members when team changes
  useEffect(() => {
    if (currentTeamId) {
      fetch(`/api/connections?teamId=${currentTeamId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConnections(data.data || [])
          }
        })
        .catch(console.error)

      fetch(`/api/teams/${currentTeamId}/members`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeamMembers(data.data || [])
          }
        })
        .catch(console.error)
    }
  }, [currentTeamId])

  // Load existing workflow
  useEffect(() => {
    if (workflowId) {
      fetch(`/api/workflows/${workflowId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            const workflow = data.data
            setWorkflowName(workflow.name)
            setWorkflowDescription(workflow.description || '')
            setTrigger(workflow.trigger)
            setIsPublished(workflow.isPublished || false)
            if (workflow.teamId) {
              setCurrentTeamId(workflow.teamId)
            }
            // Load nodes from saved data
            if (workflow.nodes && Array.isArray(workflow.nodes)) {
              const loadedNodes = workflow.nodes.map((n: any, index: number) => ({
                id: n.id || `node_${index}`,
                type: n.data?.action || n.type || 'action',
                position: n.position || { x: 250, y: 100 + index * 120 },
                data: {
                  label: n.label || n.data?.label || 'Node',
                  ...n.data,
                },
              }))
              setNodes(loadedNodes)
            }
            // Load edges from saved data
            if (workflow.edges && Array.isArray(workflow.edges)) {
              const loadedEdges = workflow.edges.map((e: any, index: number) => ({
                id: e.id || `edge_${index}`,
                source: e.source,
                target: e.target,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 2 },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 20,
                  height: 20,
                  color: '#64748b',
                },
              }))
              setEdges(loadedEdges)
            }
          }
        })
        .catch(console.error)
    }
  }, [workflowId, currentTeamId])

  // Connection handler
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = {
        ...connection,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#64748b', strokeWidth: 2 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
          color: '#64748b',
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // Add node handler
  const addNode = useCallback(
    (type: string, label: string) => {
      const id = `${type}_${Date.now()}`
      const position = {
        x: 250 + Math.random() * 200,
        y: 100 + nodes.length * 120,
      }

      const newNode: Node = {
        id,
        type,
        position,
        data: {
          label,
          action: type,
        },
      }

      setNodes((nds) => [...nds, newNode])
      setSelectedNode(newNode)
    },
    [nodes.length, setNodes]
  )

  // Delete node handler
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId))
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
      if (selectedNode?.id === nodeId) {
        setSelectedNode(null)
      }
    },
    [selectedNode, setNodes, setEdges]
  )

  // Update node data
  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<BaseNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      )
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...data } } : null))
      }
    },
    [selectedNode, setNodes]
  )

  // Save workflow
  const saveWorkflow = async (publish: boolean = false) => {
    if (!workflowName.trim()) {
      alert('Please enter a workflow name')
      return
    }

    if (!currentTeamId) {
      alert('Please select a team')
      return
    }

    setSaving(true)
    try {
      // Convert nodes/edges to the format expected by the API
      const workflowNodes = nodes.map(node => ({
        id: node.id,
        type: node.type === 'trigger' ? 'trigger' : 'action',
        label: String(node.data?.label || ''),
        position: node.position,
        data: {
          action: node.type,
          ...node.data,
        },
      }))

      const workflowEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        label: edge.sourceHandle || undefined,
      }))

      const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows'
      const method = workflowId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeamId,
          name: workflowName,
          description: workflowDescription,
          trigger,
          nodes: workflowNodes,
          edges: workflowEdges,
          isPublished: publish || isPublished,
        }),
      })

      const result = await response.json()

      if (result.data?.id || result.success) {
        if (publish) {
          setIsPublished(true)
          alert('Workflow saved and published! You can now run it.')
        } else {
          router.push('/dashboard/workflows')
        }
      } else {
        alert(result.error?.message || 'Failed to save workflow')
      }
    } catch (error) {
      console.error('Failed to save workflow:', error)
      alert('Error saving workflow')
    } finally {
      setSaving(false)
    }
  }

  // Run workflow (manual trigger)
  const runWorkflow = async () => {
    if (!workflowId) {
      alert('Please save the workflow first')
      return
    }

    if (trigger !== 'manual') {
      alert('Only workflows with manual triggers can be run directly')
      return
    }

    if (!isPublished) {
      const shouldPublish = confirm('This workflow needs to be published before it can run. Would you like to save and publish it now?')
      if (shouldPublish) {
        await saveWorkflow(true)
        return
      }
      return
    }

    setRunning(true)
    try {
      const response = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const result = await response.json()

      if (response.ok && result.data?.executionId) {
        alert(`Workflow started! Execution ID: ${result.data.executionId}`)
        // Optionally navigate to execution details
        router.push(`/dashboard/workflows/${workflowId}/executions`)
      } else {
        alert(result.error?.message || 'Failed to run workflow')
      }
    } catch (error) {
      console.error('Failed to run workflow:', error)
      alert('Error running workflow')
    } finally {
      setRunning(false)
    }
  }

  // Node click handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
  }, [])

  // Pane click handler
  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => router.push('/dashboard/workflows')}
            className="p-2 hover:bg-zinc-100 rounded-lg dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          </button>

          <div className="flex-1 max-w-xl">
            <div className="flex items-center gap-3 mb-1">
              {teams.length > 0 && (
                <select
                  value={currentTeamId || ''}
                  onChange={(e) => setCurrentTeamId(e.target.value)}
                  className="text-xs px-2 py-1 border border-zinc-300 rounded bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">Select team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
              <select
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                className="text-xs px-2 py-1 border border-zinc-300 rounded bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="manual">Manual Trigger</option>
                <option value="scheduled">Scheduled</option>
                <option value="webhook">Webhook</option>
                <option value="event">Event</option>
              </select>
            </div>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow name..."
              className="text-xl font-bold bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 w-full"
            />
            <input
              type="text"
              value={workflowDescription}
              onChange={(e) => setWorkflowDescription(e.target.value)}
              placeholder="Add description..."
              className="text-sm bg-transparent border-none outline-none text-zinc-500 dark:text-zinc-400 w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Run button - only for existing workflows with manual trigger */}
          {workflowId && trigger === 'manual' && (
            <button
              onClick={runWorkflow}
              disabled={running || saving}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
                isPublished
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
              }`}
              title={isPublished ? 'Run workflow' : 'Save and publish to enable running'}
            >
              <Play className="h-4 w-4" />
              {running ? 'Running...' : isPublished ? 'Run' : 'Run (Publish first)'}
            </button>
          )}
          <button
            onClick={() => saveWorkflow(false)}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[15, 15]}
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#64748b', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: '#64748b',
              },
            }}
          >
            <Background color="#e5e7eb" gap={20} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                switch (n.type) {
                  case 'trigger':
                    return '#3b82f6'
                  case 'discoverMigrations':
                    return '#a855f7'
                  case 'dryRun':
                    return '#06b6d4'
                  case 'executeMigrations':
                    return '#22c55e'
                  case 'rollback':
                    return '#ef4444'
                  case 'databaseQuery':
                    return '#6366f1'
                  case 'condition':
                    return '#eab308'
                  case 'approval':
                    return '#10b981'
                  case 'notification':
                    return '#ec4899'
                  case 'httpRequest':
                    return '#f97316'
                  case 'delay':
                    return '#6b7280'
                  default:
                    return '#64748b'
                }
              }}
              maskColor="rgba(0,0,0,0.1)"
            />
          </ReactFlow>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center max-w-md p-8 bg-white/80 dark:bg-zinc-900/80 rounded-2xl backdrop-blur-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <GitBranch className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Start Building Your Workflow
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Add nodes from the panel on the right to create your automation workflow.
                  Connect nodes by dragging from one handle to another.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Node Palette & Config */}
        <div className="w-80 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 flex flex-col overflow-hidden">
          {selectedNode ? (
            // Node Configuration Panel
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Configure Node</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteNode(selectedNode.id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={String(selectedNode.data?.label || '')}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                {/* Node-specific configuration */}
                {(selectedNode.type === 'discoverMigrations' ||
                  selectedNode.type === 'dryRun' ||
                  selectedNode.type === 'executeMigrations' ||
                  selectedNode.type === 'rollback' ||
                  selectedNode.type === 'databaseQuery') && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Database Connection
                    </label>
                    {connections.length === 0 ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          No connections available. Create one in Connections first.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={String(selectedNode.data?.connectionId || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { connectionId: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="">Select connection...</option>
                        {connections.map((conn) => (
                          <option key={conn.id} value={conn.id}>
                            {conn.name} ({conn.type})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {selectedNode.type === 'databaseQuery' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      SQL Query
                    </label>
                    <textarea
                      value={String(selectedNode.data?.query || '')}
                      onChange={(e) => updateNodeData(selectedNode.id, { query: e.target.value })}
                      placeholder="SELECT * FROM ..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                )}

                {selectedNode.type === 'httpRequest' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Method
                      </label>
                      <select
                        value={String(selectedNode.data?.method || 'GET')}
                        onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        URL
                      </label>
                      <input
                        type="text"
                        value={String(selectedNode.data?.url || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                        placeholder="https://api.example.com/..."
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Body (JSON)
                      </label>
                      <textarea
                        value={String(selectedNode.data?.body || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                        placeholder='{"key": "value"}'
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === 'condition' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Condition Expression
                    </label>
                    <input
                      type="text"
                      value={String(selectedNode.data?.condition || '')}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      placeholder="status === 'success'"
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Use JavaScript expressions. True goes to left handle, false to right.
                    </p>
                  </div>
                )}

                {selectedNode.type === 'approval' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Approvers
                      </label>
                      <select
                        multiple
                        value={(selectedNode.data?.approvers as string[]) || []}
                        onChange={(e) => {
                          const selected = Array.from(e.target.selectedOptions, (opt) => opt.value)
                          updateNodeData(selectedNode.id, { approvers: selected })
                        }}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        {teamMembers.map((member) => (
                          <option key={member.user.id} value={member.user.id}>
                            {member.user.name || member.user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        value={Number(selectedNode.data?.timeout || 3600)}
                        onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                        min={60}
                        max={86400}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Message
                      </label>
                      <textarea
                        value={String(selectedNode.data?.message || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                        placeholder="Please review and approve..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === 'notification' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Provider
                      </label>
                      <select
                        value={String(selectedNode.data?.provider || 'email')}
                        onChange={(e) => updateNodeData(selectedNode.id, { provider: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      >
                        <option value="email">Email</option>
                        <option value="slack">Slack</option>
                        <option value="webhook">Webhook</option>
                        <option value="team_notification">Team Notification</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Message
                      </label>
                      <textarea
                        value={String(selectedNode.data?.message || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { message: e.target.value })}
                        placeholder="Workflow completed successfully..."
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={Number(selectedNode.data?.duration || 0)}
                      onChange={(e) => updateNodeData(selectedNode.id, { duration: parseInt(e.target.value) })}
                      min={0}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                )}

                {selectedNode.type === 'shellCommand' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Command
                    </label>
                    <textarea
                      value={String(selectedNode.data?.command || '')}
                      onChange={(e) => updateNodeData(selectedNode.id, { command: e.target.value })}
                      placeholder="npm run build"
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                )}

                {selectedNode.type === 'setVariable' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Variable Name
                      </label>
                      <input
                        type="text"
                        value={String(selectedNode.data?.variableName || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { variableName: e.target.value })}
                        placeholder="myVariable"
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={String(selectedNode.data?.value || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { value: e.target.value })}
                        placeholder="value or {{expression}}"
                        className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    </div>
                  </>
                )}

                {selectedNode.type === 'transformData' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Transform Expression (JSONata)
                    </label>
                    <textarea
                      value={String(selectedNode.data?.transformFunction || '')}
                      onChange={(e) => updateNodeData(selectedNode.id, { transformFunction: e.target.value })}
                      placeholder="$.data.map(fn($x) { $x.name })"
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white font-mono dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    />
                  </div>
                )}

                {selectedNode.type === 'trigger' && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                      Trigger Type
                    </label>
                    <select
                      value={String(selectedNode.data?.triggerType || trigger)}
                      onChange={(e) => {
                        updateNodeData(selectedNode.id, { triggerType: e.target.value })
                        setTrigger(e.target.value)
                      }}
                      className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg bg-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                    >
                      <option value="manual">Manual</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="webhook">Webhook</option>
                      <option value="event">Event</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Node Palette Panel
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Add Nodes</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Click to add, then connect nodes by dragging between handles
                </p>
              </div>

              <div className="p-2">
                {categories.map((category) => {
                  const categoryNodes = nodePalette.filter((n) => n.category === category.id)
                  const isExpanded = expandedCategory === category.id

                  return (
                    <div key={category.id} className="mb-2">
                      <button
                        onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <div className="flex items-center gap-2">
                          <category.icon className="h-4 w-4 text-zinc-500" />
                          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            {category.label}
                          </span>
                        </div>
                        <ChevronRight
                          className={`h-4 w-4 text-zinc-400 transition-transform ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="mt-1 space-y-1 pl-2">
                          {categoryNodes.map((item) => (
                            <button
                              key={item.type}
                              onClick={() => addNode(item.type, item.label)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50 transition-all group"
                            >
                              <div
                                className={`p-1.5 rounded-lg bg-${item.color}-100 dark:bg-${item.color}-900/30`}
                              >
                                <item.icon
                                  className={`h-4 w-4 text-${item.color}-600 dark:text-${item.color}-400`}
                                />
                              </div>
                              <div className="text-left">
                                <div className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                  {item.label}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {item.description}
                                </div>
                              </div>
                              <Plus className="h-4 w-4 text-zinc-400 opacity-0 group-hover:opacity-100 ml-auto" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
