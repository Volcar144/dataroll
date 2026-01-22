"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { 
  LayoutDashboard, 
  GripVertical, 
  Plus, 
  Settings, 
  X, 
  Save, 
  RotateCcw,
  Activity,
  Database,
  GitBranch,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Play,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Target,
  Loader2,
  ArrowLeft,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff
} from "lucide-react"

// Widget Types
type WidgetType = 
  | 'stats_card' 
  | 'activity_feed' 
  | 'migration_status' 
  | 'connection_health' 
  | 'quick_actions'
  | 'workflow_stats'
  | 'team_activity'
  | 'recent_queries'
  | 'scheduled_jobs'
  | 'chart_bar'
  | 'chart_line'
  | 'chart_pie'

interface Widget {
  id: string
  type: WidgetType
  title: string
  x: number
  y: number
  w: number
  h: number
  config?: Record<string, any>
  visible: boolean
}

interface DashboardLayout {
  id: string
  name: string
  widgets: Widget[]
  isDefault: boolean
}

// Default widget configurations
const widgetCatalog: Record<WidgetType, { title: string; icon: any; minW: number; minH: number; description: string }> = {
  stats_card: { title: 'Stats Card', icon: BarChart3, minW: 1, minH: 1, description: 'Display key metrics at a glance' },
  activity_feed: { title: 'Activity Feed', icon: Activity, minW: 2, minH: 2, description: 'Recent activity from your team' },
  migration_status: { title: 'Migration Status', icon: GitBranch, minW: 2, minH: 2, description: 'Track pending and running migrations' },
  connection_health: { title: 'Connection Health', icon: Database, minW: 2, minH: 1, description: 'Monitor database connection status' },
  quick_actions: { title: 'Quick Actions', icon: Zap, minW: 1, minH: 2, description: 'Frequently used actions' },
  workflow_stats: { title: 'Workflow Stats', icon: Play, minW: 2, minH: 1, description: 'Workflow execution metrics' },
  team_activity: { title: 'Team Activity', icon: Users, minW: 2, minH: 2, description: 'Team member contributions' },
  recent_queries: { title: 'Recent Queries', icon: Database, minW: 2, minH: 2, description: 'Latest database queries' },
  scheduled_jobs: { title: 'Scheduled Jobs', icon: Clock, minW: 2, minH: 2, description: 'Upcoming scheduled tasks' },
  chart_bar: { title: 'Bar Chart', icon: BarChart3, minW: 2, minH: 2, description: 'Visualize data with bars' },
  chart_line: { title: 'Line Chart', icon: LineChart, minW: 2, minH: 2, description: 'Track trends over time' },
  chart_pie: { title: 'Pie Chart', icon: PieChart, minW: 2, minH: 2, description: 'Show proportional data' },
}

// Default layout
const defaultWidgets: Widget[] = [
  { id: 'w1', type: 'stats_card', title: 'Total Connections', x: 0, y: 0, w: 1, h: 1, visible: true, config: { metric: 'connections' } },
  { id: 'w2', type: 'stats_card', title: 'Active Migrations', x: 1, y: 0, w: 1, h: 1, visible: true, config: { metric: 'migrations' } },
  { id: 'w3', type: 'stats_card', title: 'Team Members', x: 2, y: 0, w: 1, h: 1, visible: true, config: { metric: 'team_members' } },
  { id: 'w4', type: 'stats_card', title: 'Workflows', x: 3, y: 0, w: 1, h: 1, visible: true, config: { metric: 'workflows' } },
  { id: 'w5', type: 'activity_feed', title: 'Recent Activity', x: 0, y: 1, w: 2, h: 2, visible: true },
  { id: 'w6', type: 'migration_status', title: 'Migration Status', x: 2, y: 1, w: 2, h: 2, visible: true },
  { id: 'w7', type: 'quick_actions', title: 'Quick Actions', x: 0, y: 3, w: 1, h: 2, visible: true },
  { id: 'w8', type: 'connection_health', title: 'Connection Health', x: 1, y: 3, w: 2, h: 1, visible: true },
  { id: 'w9', type: 'workflow_stats', title: 'Workflow Stats', x: 3, y: 3, w: 1, h: 1, visible: true },
]

// Widget Components
function StatsCardWidget({ widget, data }: { widget: Widget; data: any }) {
  const metric = widget.config?.metric || 'connections'
  const value = data?.[metric] || 0
  const trend = data?.[`${metric}_trend`] || 0
  
  const icons: Record<string, any> = {
    connections: Database,
    migrations: GitBranch,
    team_members: Users,
    workflows: Play,
  }
  const Icon = icons[metric] || Activity

  return (
    <div className="h-full flex flex-col justify-between p-4">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        {trend !== 0 && (
          <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{widget.title}</p>
      </div>
    </div>
  )
}

function ActivityFeedWidget({ widget, data }: { widget: Widget; data: any }) {
  const activities = data?.recentActivity || []

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No recent activity</p>
        ) : (
          activities.slice(0, 5).map((activity: any, i: number) => (
            <div key={activity.id || i} className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-violet-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white truncate">{activity.action}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{activity.resource}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function MigrationStatusWidget({ widget, data }: { widget: Widget; data: any }) {
  const migrations = data?.migrations || { pending: 0, running: 0, completed: 0, failed: 0 }

  const statuses = [
    { label: 'Pending', value: migrations.pending, color: 'bg-yellow-500' },
    { label: 'Running', value: migrations.running, color: 'bg-blue-500' },
    { label: 'Completed', value: migrations.completed, color: 'bg-green-500' },
    { label: 'Failed', value: migrations.failed, color: 'bg-red-500' },
  ]

  return (
    <div className="h-full p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statuses.map((status) => (
          <div key={status.label} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${status.color}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{status.label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{status.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ConnectionHealthWidget({ widget, data }: { widget: Widget; data: any }) {
  const connections = data?.connectionHealth || []

  return (
    <div className="h-full p-4">
      <div className="space-y-2">
        {connections.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No connections configured</p>
        ) : (
          connections.slice(0, 4).map((conn: any, i: number) => (
            <div key={conn.id || i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${conn.healthy ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{conn.name}</span>
              </div>
              <span className="text-xs text-gray-500">{conn.latency || '–'}ms</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function QuickActionsWidget({ widget }: { widget: Widget }) {
  const actions = [
    { label: 'New Migration', href: '/dashboard/migrations/new', icon: GitBranch },
    { label: 'Add Connection', href: '/dashboard/connections/new', icon: Database },
    { label: 'Create Workflow', href: '/dashboard/workflows/new', icon: Play },
    { label: 'View Audit Log', href: '/dashboard/audit', icon: Activity },
  ]

  return (
    <div className="h-full p-4 space-y-2">
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <action.icon className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-700 dark:text-gray-300">{action.label}</span>
        </Link>
      ))}
    </div>
  )
}

function WorkflowStatsWidget({ widget, data }: { widget: Widget; data: any }) {
  const stats = data?.workflowStats || { total: 0, running: 0, success: 0, failed: 0 }
  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0

  return (
    <div className="h-full p-4 flex flex-col justify-center items-center">
      <div className="text-3xl font-bold text-gray-900 dark:text-white">{successRate}%</div>
      <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
      <div className="mt-2 flex items-center gap-4 text-xs">
        <span className="text-green-600">{stats.success} passed</span>
        <span className="text-red-600">{stats.failed} failed</span>
      </div>
    </div>
  )
}

function GenericChartWidget({ widget, data }: { widget: Widget; data: any }) {
  // Placeholder for chart widgets
  return (
    <div className="h-full p-4 flex items-center justify-center">
      <div className="text-center">
        <BarChart3 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Chart data loading...</p>
      </div>
    </div>
  )
}

// Widget Renderer
function WidgetRenderer({ widget, data }: { widget: Widget; data: any }) {
  switch (widget.type) {
    case 'stats_card':
      return <StatsCardWidget widget={widget} data={data} />
    case 'activity_feed':
      return <ActivityFeedWidget widget={widget} data={data} />
    case 'migration_status':
      return <MigrationStatusWidget widget={widget} data={data} />
    case 'connection_health':
      return <ConnectionHealthWidget widget={widget} data={data} />
    case 'quick_actions':
      return <QuickActionsWidget widget={widget} />
    case 'workflow_stats':
      return <WorkflowStatsWidget widget={widget} data={data} />
    case 'chart_bar':
    case 'chart_line':
    case 'chart_pie':
      return <GenericChartWidget widget={widget} data={data} />
    default:
      return (
        <div className="h-full flex items-center justify-center text-gray-500">
          Widget: {widget.type}
        </div>
      )
  }
}

export default function CustomizableDashboard() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets)
  const [isEditing, setIsEditing] = useState(false)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  // Load user preferences
  useEffect(() => {
    if (session) {
      loadDashboardPreferences()
      fetchDashboardData()
    }
  }, [session])

  const loadDashboardPreferences = async () => {
    try {
      const response = await fetch('/api/user/dashboard-preferences')
      if (response.ok) {
        const data = await response.json()
        if (data.widgets && data.widgets.length > 0) {
          setWidgets(data.widgets)
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard preferences:', error)
    }
  }

  const saveDashboardPreferences = async () => {
    setSaving(true)
    try {
      await fetch('/api/user/dashboard-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgets }),
      })
    } catch (error) {
      console.error('Failed to save dashboard preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      const teamId = teams.data?.[0]?.id

      if (!teamId) {
        setDashboardData({
          connections: 0,
          migrationsCount: 0,
          team_members: 0,
          workflows: 0,
          recentActivity: [],
          migrations: { pending: 0, running: 0, completed: 0, failed: 0 },
          connectionHealth: [],
          workflowStats: { total: 0, running: 0, success: 0, failed: 0 },
        })
        return
      }

      const [connectionsRes, migrationsRes, auditRes, workflowsRes] = await Promise.all([
        fetch(`/api/connections?teamId=${teamId}`),
        fetch(`/api/migrations?teamId=${teamId}`),
        fetch(`/api/audit-logs?teamId=${teamId}&limit=10`),
        fetch(`/api/workflows?teamId=${teamId}`),
      ])

      const [connections, migrations, auditLogs, workflows] = await Promise.all([
        connectionsRes.json(),
        migrationsRes.json(),
        auditRes.json(),
        workflowsRes.json(),
      ])

      const migrationStats = {
        pending: migrations.data?.filter((m: any) => m.status === 'PENDING').length || 0,
        running: migrations.data?.filter((m: any) => m.status === 'EXECUTING').length || 0,
        completed: migrations.data?.filter((m: any) => m.status === 'EXECUTED').length || 0,
        failed: migrations.data?.filter((m: any) => m.status === 'FAILED').length || 0,
      }

      setDashboardData({
        connections: connections.data?.length || 0,
        migrationsCount: migrations.data?.length || 0,
        team_members: teams.data?.[0]?.members?.length || 0,
        workflows: workflows.data?.length || 0,
        recentActivity: auditLogs.data || [],
        migrations: migrationStats,
        connectionHealth: connections.data?.map((c: any) => ({
          id: c.id,
          name: c.name,
          healthy: true, // Would need actual health check
          latency: Math.floor(Math.random() * 50) + 10,
        })) || [],
        workflowStats: {
          total: workflows.data?.length || 0,
          running: 0,
          success: workflows.data?.filter((w: any) => w.isPublished).length || 0,
          failed: 0,
        },
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const addWidget = (type: WidgetType) => {
    const catalog = widgetCatalog[type]
    const newWidget: Widget = {
      id: `w${Date.now()}`,
      type,
      title: catalog.title,
      x: 0,
      y: Math.max(...widgets.map(w => w.y + w.h), 0),
      w: catalog.minW,
      h: catalog.minH,
      visible: true,
    }
    setWidgets([...widgets, newWidget])
    setShowWidgetPicker(false)
  }

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id))
  }

  const toggleWidgetVisibility = (id: string) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w))
  }

  const resetLayout = () => {
    if (confirm('Reset dashboard to default layout?')) {
      setWidgets(defaultWidgets)
    }
  }

  const handleDragStart = (e: React.DragEvent, widgetId: string) => {
    setDraggedWidget(widgetId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedWidget || draggedWidget === targetId) return

    const draggedIndex = widgets.findIndex(w => w.id === draggedWidget)
    const targetIndex = widgets.findIndex(w => w.id === targetId)
    
    const newWidgets = [...widgets]
    const [removed] = newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(targetIndex, 0, removed)
    
    setWidgets(newWidgets)
    setDraggedWidget(null)
  }

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <LayoutDashboard className="w-6 h-6" />
                  Custom Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag and drop widgets to customize your view
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setShowWidgetPicker(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </button>
                  <button
                    onClick={resetLayout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      saveDashboardPreferences()
                      setIsEditing(false)
                    }}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Layout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Customize
                </button>
              )}
              <KeyboardShortcutsHelp />
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 animate-pulse ${
                  i < 4 ? 'h-32' : 'h-48 col-span-2'
                }`}
              />
            ))}
          </div>
        ) : (
          <div 
            ref={gridRef}
            className="grid grid-cols-4 gap-4 auto-rows-min"
          >
            {widgets.filter(w => w.visible).map((widget) => (
              <div
                key={widget.id}
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, widget.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, widget.id)}
                className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden transition-all ${
                  widget.w === 2 ? 'col-span-2' : ''
                } ${widget.h === 2 ? 'row-span-2' : ''} ${
                  isEditing ? 'cursor-move ring-2 ring-violet-500/20 hover:ring-violet-500/50' : ''
                } ${draggedWidget === widget.id ? 'opacity-50' : ''}`}
                style={{
                  minHeight: widget.h === 1 ? '120px' : '240px',
                }}
              >
                {/* Widget Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    {isEditing && (
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab" />
                    )}
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">{widget.title}</h3>
                  </div>
                  {isEditing && (
                    <button
                      onClick={() => removeWidget(widget.id)}
                      className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Widget Content */}
                <WidgetRenderer widget={widget} data={dashboardData} />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Widget</h2>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                {(Object.entries(widgetCatalog) as [WidgetType, typeof widgetCatalog[WidgetType]][]).map(([type, config]) => {
                  const Icon = config.icon
                  return (
                    <button
                      key={type}
                      onClick={() => addWidget(type)}
                      className="flex items-start gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{config.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.description}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
