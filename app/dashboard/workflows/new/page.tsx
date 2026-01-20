"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { 
  Play, GitBranch, Clock, Bell, CheckCircle, AlertCircle, 
  Database, Code, X, Plus, Save, Trash2, Settings 
} from "lucide-react"
import type { WorkflowNode, WorkflowEdge, WorkflowVariable } from "@/lib/workflows/types"

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

export default function WorkflowBuilderPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  
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
    }
  }, [session, isPending, router])

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

    setSaving(true)
    try {
      // Get team ID
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      const teamId = teams.data?.[0]?.id

      if (!teamId) {
        alert('Please create a team first')
        return
      }

      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          name: workflow.name,
          description: workflow.description,
          trigger: workflow.trigger,
          triggerConfig: workflow.triggerConfig,
          definition: {
            version: '1.0',
            name: workflow.name,
            description: workflow.description,
            trigger: workflow.trigger,
            variables: workflow.variables,
            nodes: workflow.nodes,
            edges: workflow.edges,
          }
        })
      })

      const data = await res.json()

      if (data.success) {
        router.push('/dashboard/workflows')
      } else {
        alert(data.message || 'Failed to create workflow')
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
          <div className="flex-1 max-w-xl">
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
              className="text-sm bg-transparent border-none outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400 w-full mt-1"
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
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Condition Expression
                    </label>
                    <textarea
                      value={selectedNode.data.condition as string || ''}
                      onChange={(e) => updateNode(selectedNode.id, {
                        data: { ...selectedNode.data, condition: e.target.value }
                      })}
                      placeholder="e.g., status === 'success'"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                    />
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Duration (seconds)
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
                          data: { ...selectedNode.data, provider: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="email">Email</option>
                        <option value="slack">Slack</option>
                        <option value="webhook">Webhook</option>
                        <option value="team_notification">Team Notification</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Message
                      </label>
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
                  </>
                )}

                {selectedNode.type === 'approval' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Approvers (user IDs, comma-separated)
                      </label>
                      <input
                        type="text"
                        value={(selectedNode.data.approvers as string[] || []).join(', ')}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, approvers: e.target.value.split(',').map(s => s.trim()) }
                        })}
                        placeholder="user1, user2, user3"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min="60"
                        max="86400"
                        value={selectedNode.data.timeout as number || 3600}
                        onChange={(e) => updateNode(selectedNode.id, {
                          data: { ...selectedNode.data, timeout: parseInt(e.target.value) }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
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
