'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Plus, Save, Trash2, Play, Settings, Type, ArrowLeft } from 'lucide-react'

// Custom node components
const ActionNode = ({ data }: { data: any }) => (
  <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:bg-blue-900/20">
    <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">{data.label}</div>
    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{data.action || 'Action'}</div>
  </div>
)

const ConditionNode = ({ data }: { data: any }) => (
  <div className="rounded-lg border-2 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/20">
    <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{data.label}</div>
    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Condition</div>
  </div>
)

const ApprovalNode = ({ data }: { data: any }) => (
  <div className="rounded-lg border-2 border-green-500 bg-green-50 p-4 dark:bg-green-900/20">
    <div className="text-sm font-semibold text-green-700 dark:text-green-300">{data.label}</div>
    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Approval</div>
  </div>
)

const nodeTypes = {
  action: ActionNode,
  condition: ConditionNode,
  approval: ApprovalNode,
}

interface WorkflowEditorProps {
  workflowId?: string
  initialData?: any
}

export default function WorkflowEditor() {
  const params = useParams()
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesState] = useEdgesState<Edge>([])
  const [workflowName, setWorkflowName] = useState('New Workflow')
  const [workflowDescription, setWorkflowDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNodeMenu, setShowNodeMenu] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [loading, setLoading] = useState(true)

  const onEdgesChange = useCallback((changes: any) => {
    onEdgesState(changes)
  }, [onEdgesState])

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin')
    } else if (!isPending) {
      setLoading(false)
    }
  }, [session, isPending, router])

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds))
    },
    [setEdges]
  )

  const addNode = (type: 'action' | 'condition' | 'approval') => {
    const newNode: Node = {
      id: `${type}_${Date.now()}`,
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nodes.length + 1}`,
        action: type === 'action' ? 'discover_migrations' : undefined,
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowNodeMenu(false)
  }

  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
      setEdges((eds) =>
        eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
      )
      setSelectedNode(null)
    }
  }

  const saveWorkflow = async () => {
    if (!workflowName) {
      alert('Please enter a workflow name')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(
        params?.id ? `/api/workflows/${params.id}` : '/api/workflows',
        {
          method: params?.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: workflowName,
            description: workflowDescription,
            nodes,
            edges,
            config: {
              trigger: 'manual',
            },
          }),
        }
      )

      const result = await response.json()
      if (result.success) {
        router.push('/dashboard/workflows')
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => router.push('/dashboard/workflows')}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              placeholder="Workflow name"
              className="text-xl font-semibold bg-transparent focus:outline-none dark:text-zinc-100"
            />
          </div>
          <input
            type="text"
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
            placeholder="Add description..."
            className="text-sm bg-transparent text-gray-600 focus:outline-none dark:text-gray-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNodeMenu(!showNodeMenu)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Node
          </button>

          <button
            onClick={saveWorkflow}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Node Menu */}
      {showNodeMenu && (
        <div className="border-b border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex gap-2">
            <button
              onClick={() => addNode('action')}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-200"
            >
              <Play className="h-4 w-4" />
              Action
            </button>
            <button
              onClick={() => addNode('condition')}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200"
            >
              <Type className="h-4 w-4" />
              Condition
            </button>
            <button
              onClick={() => addNode('approval')}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200"
            >
              <Settings className="h-4 w-4" />
              Approval
            </button>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>

        {/* Node Inspector */}
        {selectedNode && (
          <div className="absolute bottom-4 right-4 w-80 rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Node Settings</h3>
              <button
                onClick={deleteSelectedNode}
                className="text-red-600 hover:text-red-700 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Label</label>
                <input
                  type="text"
                  value={String(selectedNode.data?.label || '')}
                  onChange={(e) => {
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === selectedNode.id
                          ? {
                              ...n,
                              data: { ...n.data, label: e.target.value },
                            }
                          : n
                      )
                    )
                    setSelectedNode({
                      ...selectedNode,
                      data: { ...selectedNode.data, label: e.target.value },
                    })
                  }}
                  className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>

              {selectedNode.type === 'action' && (
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Action Type</label>
                  <select
                    value={String(selectedNode.data?.action || '')}
                    onChange={(e) => {
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === selectedNode.id
                            ? {
                                ...n,
                                data: { ...n.data, action: e.target.value },
                              }
                            : n
                        )
                      )
                      setSelectedNode({
                        ...selectedNode,
                        data: { ...selectedNode.data, action: e.target.value },
                      })
                    }}
                    className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="discover_migrations">Discover Migrations</option>
                    <option value="dry_run">Dry Run</option>
                    <option value="execute_migrations">Execute Migrations</option>
                    <option value="rollback">Rollback</option>
                    <option value="custom_api_call">Custom API Call</option>
                    <option value="database_query">Database Query</option>
                  </select>
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Condition</label>
                  <input
                    type="text"
                    placeholder="e.g., status == 'success'"
                    className="mt-1 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
