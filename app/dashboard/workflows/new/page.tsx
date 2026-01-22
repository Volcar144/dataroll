"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { 
  Play, GitBranch, Clock, Bell, CheckCircle, AlertCircle, 
  Database, Code, X, Plus, Save, Trash2, Settings, HelpCircle, Info 
} from "lucide-react"
import type { WorkflowNode, WorkflowEdge, WorkflowVariable } from "@/lib/workflows/types"

interface TeamMember {
  id: string
  user: {
    id: string
    name: string | null
    email: string
  }
  role: string
}

interface Team {
  id: string
  name: string
  slug: string
}

interface Integration {
  id: string
  type: string
  name: string
  isActive: boolean
  isDefault: boolean
}

interface DatabaseConnection {
  id: string
  name: string
  type: string
  host: string
  database: string
}

interface WorkflowForm {
  name: string
  description: string
  trigger: 'manual' | 'scheduled' | 'webhook' | 'event'
  triggerConfig?: {
    cron?: string
    webhook_url?: string
    event_type?: string
  }
  variables: WorkflowVariable[]
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

const NODE_TYPES = [
  { type: 'action', label: 'Action', icon: Play, color: 'blue' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'yellow' },
  { type: 'approval', label: 'Approval', icon: CheckCircle, color: 'green' },
  { type: 'notification', label: 'Notification', icon: Bell, color: 'purple' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'gray' },
] as const

const ACTIONS = [
  'discover_migrations',
  'dry_run',
  'execute_migrations',
  'rollback',
  'custom_api_call',
  'database_query',
  'http_request',
  'shell_command',
  'set_variable',
  'transform_data',
] as const

const ACTION_DESCRIPTIONS: Record<string, string> = {
  discover_migrations: 'Automatically scan for pending database migrations that haven\'t been executed yet',
  dry_run: 'Test run migrations without actually applying them to the database - safe preview mode',
  execute_migrations: 'Apply pending migrations to the database - makes actual schema changes',
  rollback: 'Revert the last migration or rollback to a specific version',
  custom_api_call: 'Make HTTP requests to external APIs with custom headers and payloads',
  database_query: 'Execute a custom SQL query against the connected database',
  http_request: 'Send webhook or HTTP request to trigger external systems',
  shell_command: 'Run a command on the server (requires proper permissions)',
  set_variable: 'Store or update a workflow variable for use in subsequent steps',
  transform_data: 'Transform data from previous steps using JSONata expressions',
}

export default function WorkflowBuilderPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  
  const [workflow, setWorkflow] = useState<WorkflowForm>({
    name: '',
    description: '',
    trigger: 'manual',
    variables: [],
    nodes: [],
    edges: [],
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin')
    } else if (session) {
      // Fetch user's teams
      fetch('/api/teams')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeams(data.data || [])
            // Auto-select first team
            if (data.data && data.data.length > 0) {
              setCurrentTeamId(data.data[0].id)
            }
          }
        })
        .catch(err => console.error('Failed to fetch teams:', err))

      // Fetch user's integrations
      fetch('/api/integrations')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setIntegrations(data.data || [])
          }
        })
        .catch(err => console.error('Failed to fetch integrations:', err))
    }
  }, [session, isPending, router])

  // Fetch team members and connections when team is selected
  useEffect(() => {
    if (currentTeamId) {
      // Fetch team members
      fetch(`/api/teams/${currentTeamId}/members`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setTeamMembers(data.data || [])
          }
        })
        .catch(err => console.error('Failed to fetch team members:', err))
      
      // Fetch database connections for this team
      fetch(`/api/connections?teamId=${currentTeamId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setConnections(data.data || [])
          }
        })
        .catch(err => console.error('Failed to fetch connections:', err))
    }
  }, [currentTeamId])

  const addNode = (type: typeof NODE_TYPES[number]['type']) => {
    const newNode: WorkflowNode = {
      id: `node_${Date.now()}`,
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${workflow.nodes.length + 1}`,
      data: type === 'action' ? { action: 'discover_migrations' } : {}
    }
    
    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }))
    setSelectedNodeId(newNode.id)
  }

  const updateNode = (nodeId: string, updates: Partial<WorkflowNode>) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      )
    }))
  }

  const deleteNode = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId),
      edges: prev.edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId)
    }))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null)
    }
  }

  const addEdge = (sourceId: string, targetId: string) => {
    const newEdge: WorkflowEdge = {
      source: sourceId,
      target: targetId
    }
    
    setWorkflow(prev => ({
      ...prev,
      edges: [...prev.edges, newEdge]
    }))
  }

  const addVariable = () => {
    const newVar: WorkflowVariable = {
      name: `var_${workflow.variables.length + 1}`,
      type: 'string',
      isSecret: false
    }
    
    setWorkflow(prev => ({
      ...prev,
      variables: [...prev.variables, newVar]
    }))
  }

  const updateVariable = (index: number, updates: Partial<WorkflowVariable>) => {
    setWorkflow(prev => ({
      ...prev,
      variables: prev.variables.map((v, i) =>
        i === index ? { ...v, ...updates } : v
      )
    }))
  }

  const deleteVariable = (index: number) => {
    setWorkflow(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    if (!workflow.name.trim()) {
      alert('Please enter a workflow name')
      return
    }

    if (!currentTeamId) {
      alert('Please select a team for this workflow')
      return
    }

    setSaving(true)
    try {

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: currentTeamId,
          name: workflow.name,
          description: workflow.description,
          trigger: workflow.trigger,
        })
      })

      const data = await res.json()

      if (data.data?.id) {
        router.push('/dashboard/workflows')
      } else {
        alert(data.error?.message || 'Failed to create workflow')
      }
    } catch (error) {
      console.error('Failed to save workflow', error)
      alert('Failed to save workflow')
    } finally {
      setSaving(false)
    }
  }

  const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1 max-w-xl space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Team</label>
              <select
                value={currentTeamId || ''}
                onChange={(e) => setCurrentTeamId(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select a team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={workflow.name}
              onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Workflow name..."
              className="text-2xl font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400 w-full"
            />
            <input
              type="text"
              value={workflow.description}
              onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Description..."
              className="text-sm bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 w-full"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Workflow'}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Node Palette */}
        <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            TRIGGER
          </h3>
          <div className="space-y-2 mb-6">
            <select
              value={workflow.trigger}
              onChange={(e) => setWorkflow(prev => ({ 
                ...prev, 
                trigger: e.target.value as WorkflowForm['trigger'] 
              }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="manual">Manual</option>
              <option value="scheduled">Scheduled</option>
              <option value="webhook">Webhook</option>
              <option value="event">Event</option>
            </select>
            
            {workflow.trigger === 'scheduled' && (
              <input
                type="text"
                placeholder="Cron expression (e.g., 0 0 * * *)"
                value={workflow.triggerConfig?.cron || ''}
                onChange={(e) => setWorkflow(prev => ({
                  ...prev,
                  triggerConfig: { ...prev.triggerConfig, cron: e.target.value }
                }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            )}
          </div>

          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            ADD NODES
          </h3>
          <div className="space-y-2">
            {NODE_TYPES.map(({ type, label, icon: Icon, color }) => (
              <button
                key={type}
                onClick={() => addNode(type)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg border-2 border-${color}-200 dark:border-${color}-800 hover:bg-${color}-50 dark:hover:bg-${color}-900/20 transition-colors text-left`}
              >
                <Icon className={`w-4 h-4 text-${color}-600 dark:text-${color}-400`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                VARIABLES
              </h3>
              <button
                onClick={addVariable}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Plus className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            {workflow.variables.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No variables yet
              </p>
            ) : (
              <div className="space-y-2">
                {workflow.variables.map((variable, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 text-xs p-2 bg-gray-50 dark:bg-gray-700 rounded"
                  >
                    <Code className="w-3 h-3 text-gray-500" />
                    <span className="flex-1 font-mono text-gray-900 dark:text-white">
                      {variable.name}
                    </span>
                    <button
                      onClick={() => deleteVariable(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 p-8 overflow-auto">
          {workflow.nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <GitBranch className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Start Building Your Workflow
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Add nodes from the left panel to create your automation workflow
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Play className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Trigger: {workflow.trigger}
                </span>
              </div>
              
              {workflow.nodes.map((node, index) => {
                const nodeType = NODE_TYPES.find(t => t.type === node.type)
                const Icon = nodeType?.icon || Play
                const color = nodeType?.color || 'gray'
                
                return (
                  <div key={node.id}>
                    {index > 0 && (
                      <div className="flex items-center justify-center py-2">
                        <div className="w-px h-8 bg-gray-300 dark:bg-gray-600"></div>
                      </div>
                    )}
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                        selectedNodeId === node.id
                          ? 'border-blue-500 dark:border-blue-400 shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900`}>
                            <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {node.label}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {node.type}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNode(node.id)
                          }}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar - Node Configuration */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Configure Node
                </h3>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label
                  </label>
                  <input
                    type="text"
                    value={selectedNode.label}
                    onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                {selectedNode.type === 'action' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Action Type
                      </label>
                      <select
                        value={selectedNode.data.action as string}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, action: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        {ACTIONS.map(action => (
                          <option key={action} value={action}>
                            {action.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                      {selectedNode.data.action && ACTION_DESCRIPTIONS[selectedNode.data.action as string] && (
                        <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            {ACTION_DESCRIPTIONS[selectedNode.data.action as string]}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Database connection selector for database actions */}
                    {['discover_migrations', 'dry_run', 'execute_migrations', 'rollback', 'database_query'].includes(selectedNode.data.action as string) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Database Connection
                        </label>
                        {connections.length === 0 ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-amber-200">
                              No database connections available. Create one in Connections first.
                            </p>
                          </div>
                        ) : (
                          <select
                            value={selectedNode.data.connectionId as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, connectionId: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select connection...</option>
                            {connections.map(conn => (
                              <option key={conn.id} value={conn.id}>
                                {conn.name} ({conn.type})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* SQL query input for database_query action */}
                    {selectedNode.data.action === 'database_query' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          SQL Query
                        </label>
                        <textarea
                          value={selectedNode.data.query as string || ''}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, query: e.target.value }
                          })}
                          placeholder="SELECT * FROM users WHERE...\nINSERT INTO...\nUPDATE..."
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Use {`{{variable_name}}`} to reference workflow variables
                        </p>
                      </div>
                    )}

                    {/* HTTP request configuration */}
                    {['http_request', 'custom_api_call'].includes(selectedNode.data.action as string) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            HTTP Method
                          </label>
                          <select
                            value={selectedNode.data.method as string || 'GET'}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, method: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="PATCH">PATCH</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            URL
                          </label>
                          <input
                            type="url"
                            value={selectedNode.data.url as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, url: e.target.value }
                            })}
                            placeholder="https://api.example.com/endpoint"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Headers (JSON)
                          </label>
                          <textarea
                            value={selectedNode.data.headers as string || '{}'}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, headers: e.target.value }
                            })}
                            placeholder='{"Content-Type": "application/json", "Authorization": "Bearer token"}'
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Request Body (JSON)
                          </label>
                          <textarea
                            value={selectedNode.data.body as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, body: e.target.value }
                            })}
                            placeholder='{"key": "value"}'
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                        </div>
                      </>
                    )}

                    {/* Shell command configuration */}
                    {selectedNode.data.action === 'shell_command' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Command
                          </label>
                          <textarea
                            value={selectedNode.data.command as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, command: e.target.value }
                            })}
                            placeholder="echo 'Hello World'\nprisma migrate deploy"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Working Directory (optional)
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data.workingDir as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, workingDir: e.target.value }
                            })}
                            placeholder="/app or leave empty for default"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            Shell commands run with restricted permissions. Ensure the command is safe and necessary.
                          </p>
                        </div>
                      </>
                    )}

                    {/* Set variable configuration */}
                    {selectedNode.data.action === 'set_variable' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Variable Name
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data.variableName as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, variableName: e.target.value }
                            })}
                            placeholder="my_variable"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Value Expression
                          </label>
                          <textarea
                            value={selectedNode.data.variableValue as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, variableValue: e.target.value }
                            })}
                            placeholder="Static value or expression like {{prev_step.result.count}}"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </>
                    )}

                    {/* Transform data configuration */}
                    {selectedNode.data.action === 'transform_data' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Input Data (reference)
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data.inputRef as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, inputRef: e.target.value }
                            })}
                            placeholder="{{prev_step.result}}"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            JSONata Expression
                          </label>
                          <textarea
                            value={selectedNode.data.transform as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, transform: e.target.value }
                            })}
                            placeholder="$.data.users[status='active'].email"
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <a href="https://jsonata.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                              Learn JSONata syntax →
                            </a>
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}

                {selectedNode.type === 'condition' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Condition Type
                      </label>
                      <select
                        value={selectedNode.data.conditionType as string || 'expression'}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, conditionType: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="expression">JavaScript Expression</option>
                        <option value="comparison">Simple Comparison</option>
                      </select>
                    </div>

                    {selectedNode.data.conditionType === 'comparison' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Left Value (reference)
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data.leftValue as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, leftValue: e.target.value }
                            })}
                            placeholder="{{prev_step.result.status}}"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Operator
                          </label>
                          <select
                            value={selectedNode.data.operator as string || 'equals'}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, operator: e.target.value }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="equals">Equals (==)</option>
                            <option value="not_equals">Not Equals (!=)</option>
                            <option value="greater_than">Greater Than ({'>'})</option>
                            <option value="less_than">Less Than ({'<'})</option>
                            <option value="greater_or_equal">Greater or Equal ({'>'}=)</option>
                            <option value="less_or_equal">Less or Equal ({'<'}=)</option>
                            <option value="contains">Contains</option>
                            <option value="not_contains">Does Not Contain</option>
                            <option value="starts_with">Starts With</option>
                            <option value="ends_with">Ends With</option>
                            <option value="is_empty">Is Empty</option>
                            <option value="is_not_empty">Is Not Empty</option>
                          </select>
                        </div>
                        {!['is_empty', 'is_not_empty'].includes(selectedNode.data.operator as string) && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Right Value
                            </label>
                            <input
                              type="text"
                              value={selectedNode.data.rightValue as string || ''}
                              onChange={(e) => updateNode(selectedNode.id, {
                                data: { ...selectedNode.data, rightValue: e.target.value }
                              })}
                              placeholder="success or {{variable}}"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          JavaScript Expression
                        </label>
                        <textarea
                          value={selectedNode.data.condition as string || ''}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, condition: e.target.value }
                          })}
                          placeholder={`// Examples:\nctx.prev_step.result.status === 'success'\nctx.variables.count > 10\nctx.prev_step.result.data.length > 0`}
                          rows={5}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Access previous results via <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">ctx.prev_step</code> and variables via <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">ctx.variables</code>
                        </p>
                      </div>
                    )}

                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Branch Labels</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">True Branch</label>
                          <input
                            type="text"
                            value={selectedNode.data.trueBranchLabel as string || 'Yes'}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, trueBranchLabel: e.target.value }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400">False Branch</label>
                          <input
                            type="text"
                            value={selectedNode.data.falseBranchLabel as string || 'No'}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, falseBranchLabel: e.target.value }
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {selectedNode.type === 'delay' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delay Type
                      </label>
                      <select
                        value={selectedNode.data.delayType as string || 'fixed'}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, delayType: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="fixed">Fixed Duration</option>
                        <option value="until">Until Specific Time</option>
                        <option value="cron">Wait for Schedule (Cron)</option>
                      </select>
                    </div>

                    {(selectedNode.data.delayType === 'fixed' || !selectedNode.data.delayType) && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Duration
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={selectedNode.data.duration as number || 60}
                              onChange={(e) => updateNode(selectedNode.id, {
                                data: { ...selectedNode.data, duration: parseInt(e.target.value) }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Unit
                            </label>
                            <select
                              value={selectedNode.data.durationUnit as string || 'seconds'}
                              onChange={(e) => updateNode(selectedNode.id, {
                                data: { ...selectedNode.data, durationUnit: e.target.value }
                              })}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value="seconds">Seconds</option>
                              <option value="minutes">Minutes</option>
                              <option value="hours">Hours</option>
                              <option value="days">Days</option>
                            </select>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Workflow will pause for {selectedNode.data.duration || 60} {selectedNode.data.durationUnit || 'seconds'}
                        </p>
                      </>
                    )}

                    {selectedNode.data.delayType === 'until' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Wait Until (ISO datetime or expression)
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data.untilTime as string || ''}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, untilTime: e.target.value }
                          })}
                          placeholder="2024-12-31T23:59:59Z or {{variable.scheduled_time}}"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}

                    {selectedNode.data.delayType === 'cron' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cron Expression
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data.cronExpression as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, cronExpression: e.target.value }
                            })}
                            placeholder="0 9 * * MON-FRI (weekdays at 9am)"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                          />
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                          <p className="font-medium">Common patterns:</p>
                          <p><code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">0 9 * * *</code> - Daily at 9am</p>
                          <p><code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">0 0 * * 0</code> - Weekly on Sunday</p>
                          <p><code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">0 0 1 * *</code> - Monthly on the 1st</p>
                        </div>
                      </>
                    )}
                  </>
                )}

                {selectedNode.type === 'notification' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Provider
                      </label>
                      <select
                        value={selectedNode.data.provider as string || 'email'}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, provider: e.target.value, integrationId: undefined }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="email">Email</option>
                        <option value="slack">Slack</option>
                        <option value="webhook">Webhook</option>
                        <option value="team_notification">Team Notification</option>
                      </select>
                    </div>

                    {/* Integration selector */}
                    {selectedNode.data.provider !== 'team_notification' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Use Integration
                        </label>
                        {integrations.filter(i => 
                          (selectedNode.data.provider === 'email' && i.type === 'EMAIL') ||
                          (selectedNode.data.provider === 'slack' && i.type === 'SLACK') ||
                          (selectedNode.data.provider === 'webhook' && i.type === 'WEBHOOK')
                        ).length === 0 ? (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                              No {selectedNode.data.provider} integrations configured yet.
                            </p>
                            <a 
                              href="/profile#integrations" 
                              target="_blank"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              → Set up your integrations in Profile Settings
                            </a>
                          </div>
                        ) : (
                          <select
                            value={selectedNode.data.integrationId as string || ''}
                            onChange={(e) => updateNode(selectedNode.id, {
                              data: { ...selectedNode.data, integrationId: e.target.value || undefined }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select an integration...</option>
                            {integrations
                              .filter(i => 
                                (selectedNode.data.provider === 'email' && i.type === 'EMAIL') ||
                                (selectedNode.data.provider === 'slack' && i.type === 'SLACK') ||
                                (selectedNode.data.provider === 'webhook' && i.type === 'WEBHOOK')
                              )
                              .map(integration => (
                                <option key={integration.id} value={integration.id}>
                                  {integration.name} {integration.isDefault && '(default)'}
                                </option>
                              ))
                            }
                          </select>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Integrations store your credentials securely. Configure them once in your profile.
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Message
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        You can use variables like {`{{workflow.name}}`} or {`{{step.result}}`}
                      </p>
                      <textarea
                        value={selectedNode.data.message as string || ''}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, message: e.target.value }
                        })}
                        placeholder="Notification message..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>

                    {selectedNode.data.provider === 'email' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Recipients
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data.recipients as string || ''}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, recipients: e.target.value }
                          })}
                          placeholder="email@example.com, another@example.com"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Comma-separated list of email addresses
                        </p>
                      </div>
                    )}
                  </>
                )}

                {selectedNode.type === 'approval' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Required Approvers
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        Select team members who must approve before this workflow continues
                      </p>
                      {teamMembers.length === 0 ? (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <p className="text-xs text-amber-800 dark:text-amber-200">
                            Select a team for this workflow to see available approvers
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                          {teamMembers.map((member) => {
                            const isSelected = (selectedNode.data.approvers as string[] || []).includes(member.user.id)
                            return (
                              <label
                                key={member.user.id}
                                className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const currentApprovers = (selectedNode.data.approvers as string[] || [])
                                    const newApprovers = e.target.checked
                                      ? [...currentApprovers, member.user.id]
                                      : currentApprovers.filter(id => id !== member.user.id)
                                    updateNode(selectedNode.id, {
                                      data: { ...selectedNode.data, approvers: newApprovers }
                                    })
                                  }}
                                  className="rounded border-gray-300 dark:border-gray-600"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {member.user.name || member.user.email}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {member.user.email} • {member.role}
                                  </div>
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Minimum Approvals Required
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={(selectedNode.data.approvers as string[] || []).length || 10}
                        value={selectedNode.data.minApprovals as number || 1}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, minApprovals: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Workflow continues after this many approvals
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timeout
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={selectedNode.data.timeoutValue as number || 1}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, timeoutValue: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Unit
                        </label>
                        <select
                          value={selectedNode.data.timeoutUnit as string || 'hours'}
                          onChange={(e) => updateNode(selectedNode.id, {
                            data: { ...selectedNode.data, timeoutUnit: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        On Timeout
                      </label>
                      <select
                        value={selectedNode.data.onTimeout as string || 'fail'}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, onTimeout: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="fail">Fail Workflow</option>
                        <option value="skip">Skip This Step</option>
                        <option value="auto_approve">Auto-Approve</option>
                        <option value="notify_and_wait">Send Reminder and Wait</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        Approvers will receive notifications via their configured notification channels
                      </p>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Select a node to configure it
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
