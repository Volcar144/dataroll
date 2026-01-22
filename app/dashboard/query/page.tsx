"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import Link from "next/link"
import dynamic from "next/dynamic"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { 
  Database, 
  Play, 
  Save, 
  Download, 
  Copy, 
  Check, 
  Clock, 
  Table2, 
  Code2, 
  Loader2, 
  ArrowLeft,
  ChevronDown,
  FileJson,
  FileSpreadsheet,
  History,
  BookmarkPlus,
  Bookmark,
  Trash2,
  AlertCircle,
  Info,
  Zap,
  Search,
  X,
  Settings,
  Keyboard
} from "lucide-react"

// Dynamic import of SQLEditor to avoid SSR issues with CodeMirror
const SQLEditor = dynamic(
  () => import("@/components/sql-editor").then(mod => mod.SQLEditor),
  { 
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
      </div>
    )
  }
)

// Query templates
const queryTemplates = [
  { name: 'Select All', query: 'SELECT * FROM table_name LIMIT 100;', description: 'Basic select query' },
  { name: 'Count Rows', query: 'SELECT COUNT(*) FROM table_name;', description: 'Count total rows' },
  { name: 'Find Duplicates', query: 'SELECT column_name, COUNT(*) as count\nFROM table_name\nGROUP BY column_name\nHAVING COUNT(*) > 1;', description: 'Find duplicate values' },
  { name: 'Recent Records', query: 'SELECT *\nFROM table_name\nORDER BY created_at DESC\nLIMIT 10;', description: 'Get recent records' },
  { name: 'Table Schema', query: "SELECT column_name, data_type, is_nullable\nFROM information_schema.columns\nWHERE table_name = 'your_table';", description: 'View table structure' },
  { name: 'Index Information', query: "SELECT indexname, indexdef\nFROM pg_indexes\nWHERE tablename = 'your_table';", description: 'List table indexes' },
  { name: 'Table Sizes', query: "SELECT relname as table_name,\n  pg_size_pretty(pg_total_relation_size(relid)) as total_size\nFROM pg_catalog.pg_statio_user_tables\nORDER BY pg_total_relation_size(relid) DESC;", description: 'Database table sizes' },
  { name: 'Active Connections', query: "SELECT pid, usename, application_name, client_addr, state, query\nFROM pg_stat_activity\nWHERE state != 'idle'\nORDER BY query_start;", description: 'View active connections' },
]

interface QueryResult {
  columns: string[]
  rows: any[][]
  rowCount: number
  duration: number
  error?: string
}

interface QueryHistoryItem {
  id: string
  query: string
  connectionId: string
  connectionName: string
  executedAt: string
  duration: number
  rowCount: number
  success: boolean
}

interface SavedQuery {
  id: string
  name: string
  query: string
  connectionId?: string
  createdAt: string
}

interface Connection {
  id: string
  name: string
  type: string
  environment: string
}

export default function QueryEditorPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  
  // Query state
  const [query, setQuery] = useState('SELECT * FROM users LIMIT 10;')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedConnection, setSelectedConnection] = useState<string>('')
  const [loadingConnections, setLoadingConnections] = useState(true)
  
  // UI state
  const [showHistory, setShowHistory] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table')
  const [copied, setCopied] = useState(false)
  
  // History and saved queries
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([])
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([])
  const [savingQuery, setSavingQuery] = useState(false)
  const [queryName, setQueryName] = useState('')

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchConnections()
      loadQueryHistory()
      loadSavedQueries()
    }
  }, [session])

  const fetchConnections = async () => {
    try {
      setLoadingConnections(true)
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      const teamId = teams.data?.[0]?.id
      
      if (teamId) {
        const connectionsRes = await fetch(`/api/connections?teamId=${teamId}`)
        const connectionsData = await connectionsRes.json()
        setConnections(connectionsData.data || [])
        if (connectionsData.data?.length > 0) {
          setSelectedConnection(connectionsData.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoadingConnections(false)
    }
  }

  const loadQueryHistory = () => {
    const history = localStorage.getItem('queryHistory')
    if (history) {
      setQueryHistory(JSON.parse(history))
    }
  }

  const saveToHistory = (item: QueryHistoryItem) => {
    const newHistory = [item, ...queryHistory.slice(0, 49)] // Keep last 50
    setQueryHistory(newHistory)
    localStorage.setItem('queryHistory', JSON.stringify(newHistory))
  }

  const loadSavedQueries = () => {
    const saved = localStorage.getItem('savedQueries')
    if (saved) {
      setSavedQueries(JSON.parse(saved))
    }
  }

  const saveQuery = () => {
    if (!queryName.trim()) return
    
    const newSaved: SavedQuery = {
      id: `sq_${Date.now()}`,
      name: queryName,
      query,
      connectionId: selectedConnection,
      createdAt: new Date().toISOString(),
    }
    
    const updated = [newSaved, ...savedQueries]
    setSavedQueries(updated)
    localStorage.setItem('savedQueries', JSON.stringify(updated))
    setQueryName('')
    setSavingQuery(false)
  }

  const deleteSavedQuery = (id: string) => {
    const updated = savedQueries.filter(q => q.id !== id)
    setSavedQueries(updated)
    localStorage.setItem('savedQueries', JSON.stringify(updated))
  }

  const executeQuery = async () => {
    if (!selectedConnection || !query.trim()) return
    
    setLoading(true)
    setResult(null)
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/connections/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: selectedConnection,
          query: query.trim(),
        }),
      })
      
      // Check if response is ok and has content
      const text = await response.text()
      let data
      try {
        data = text ? JSON.parse(text) : { error: { message: 'Empty response from server' } }
      } catch (parseError) {
        data = { error: { message: `Failed to parse response: ${text.substring(0, 100)}` } }
      }
      const duration = Date.now() - startTime
      
      if (data.error) {
        setResult({
          columns: [],
          rows: [],
          rowCount: 0,
          duration,
          error: data.error.message || data.error,
        })
        saveToHistory({
          id: `qh_${Date.now()}`,
          query,
          connectionId: selectedConnection,
          connectionName: connections.find(c => c.id === selectedConnection)?.name || 'Unknown',
          executedAt: new Date().toISOString(),
          duration,
          rowCount: 0,
          success: false,
        })
      } else {
        const columns = data.data?.columns || (data.data?.rows?.[0] ? Object.keys(data.data.rows[0]) : [])
        const rows = data.data?.rows?.map((row: any) => columns.map((col: string) => row[col])) || []
        
        setResult({
          columns,
          rows,
          rowCount: data.data?.rowCount || rows.length,
          duration,
        })
        
        saveToHistory({
          id: `qh_${Date.now()}`,
          query,
          connectionId: selectedConnection,
          connectionName: connections.find(c => c.id === selectedConnection)?.name || 'Unknown',
          executedAt: new Date().toISOString(),
          duration,
          rowCount: rows.length,
          success: true,
        })
      }
    } catch (error) {
      const duration = Date.now() - startTime
      setResult({
        columns: [],
        rows: [],
        rowCount: 0,
        duration,
        error: error instanceof Error ? error.message : 'Query execution failed',
      })
    } finally {
      setLoading(false)
    }
  }

  const exportResults = (format: 'csv' | 'json') => {
    if (!result || !result.columns.length) return
    
    let content: string
    let filename: string
    let mimeType: string
    
    if (format === 'json') {
      const jsonData = result.rows.map(row => 
        result.columns.reduce((obj, col, i) => ({ ...obj, [col]: row[i] }), {})
      )
      content = JSON.stringify(jsonData, null, 2)
      filename = `query_results_${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      const csvHeader = result.columns.map(c => `"${c}"`).join(',')
      const csvRows = result.rows.map(row => 
        row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
      )
      content = [csvHeader, ...csvRows].join('\n')
      filename = `query_results_${Date.now()}.csv`
      mimeType = 'text/csv'
    }
    
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyResults = () => {
    if (!result || !result.columns.length) return
    
    const text = result.rows.map(row => row.join('\t')).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Note: Keyboard shortcut (Cmd/Ctrl+Enter) is handled by CodeMirror

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
                  <Code2 className="w-6 h-6" />
                  Query Editor
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Execute SQL queries with syntax highlighting
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                <Keyboard className="w-3 h-3" />
                <span>⌘+Enter to run</span>
              </div>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1 space-y-4">
            {/* Connection Selector */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Connection
              </label>
              {loadingConnections ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                <select
                  value={selectedConnection}
                  onChange={(e) => setSelectedConnection(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  {connections.length === 0 ? (
                    <option value="">No connections available</option>
                  ) : (
                    connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.type})
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* Templates */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Templates
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
              </button>
              {showTemplates && (
                <div className="border-t border-gray-200 dark:border-gray-800 max-h-64 overflow-y-auto">
                  {queryTemplates.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => setQuery(template.query)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{template.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Queries */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setShowSaved(!showSaved)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-violet-500" />
                  Saved Queries
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSaved ? 'rotate-180' : ''}`} />
              </button>
              {showSaved && (
                <div className="border-t border-gray-200 dark:border-gray-800 max-h-64 overflow-y-auto">
                  {savedQueries.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">No saved queries</p>
                  ) : (
                    savedQueries.map((sq) => (
                      <div
                        key={sq.id}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <button
                          onClick={() => setQuery(sq.query)}
                          className="flex-1 text-left"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{sq.name}</p>
                        </button>
                        <button
                          onClick={() => deleteSavedQuery(sq.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Query History */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-500" />
                  History
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`} />
              </button>
              {showHistory && (
                <div className="border-t border-gray-200 dark:border-gray-800 max-h-64 overflow-y-auto">
                  {queryHistory.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-gray-500 text-center">No query history</p>
                  ) : (
                    queryHistory.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setQuery(item.query)
                          setSelectedConnection(item.connectionId)
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {item.success ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                          <span className="text-xs text-gray-500">{item.connectionName}</span>
                          <span className="text-xs text-gray-400">· {item.duration}ms</span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white truncate font-mono">
                          {item.query.slice(0, 50)}...
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </aside>

          {/* Main Editor Area */}
          <div className="lg:col-span-3 space-y-4">
            {/* Editor */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <button
                    onClick={executeQuery}
                    disabled={loading || !selectedConnection || !query.trim()}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    Run
                  </button>
                  
                  {savingQuery ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Query name..."
                        value={queryName}
                        onChange={(e) => setQueryName(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                        autoFocus
                      />
                      <button
                        onClick={saveQuery}
                        disabled={!queryName.trim()}
                        className="p-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setSavingQuery(false)}
                        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSavingQuery(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <BookmarkPlus className="w-4 h-4" />
                      Save
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Info className="w-4 h-4" />
                  <span>Use ⌘/Ctrl+Enter to execute</span>
                </div>
              </div>
              
              {/* CodeMirror SQL Editor */}
              <SQLEditor
                value={query}
                onChange={setQuery}
                onExecute={executeQuery}
                dialect="postgresql"
                height="256px"
              />
            </div>

            {/* Results */}
            {(result || loading) && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Results Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Results
                    </span>
                    {result && !result.error && (
                      <>
                        <span className="text-xs text-gray-500">
                          {result.rowCount} row{result.rowCount !== 1 ? 's' : ''}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.duration}ms
                        </span>
                      </>
                    )}
                  </div>
                  
                  {result && !result.error && (
                    <div className="flex items-center gap-2">
                      {/* View Mode Toggle */}
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                          onClick={() => setViewMode('table')}
                          className={`px-3 py-1 text-xs ${viewMode === 'table' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          <Table2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('json')}
                          className={`px-3 py-1 text-xs ${viewMode === 'json' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          <FileJson className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Export */}
                      <button
                        onClick={() => exportResults('csv')}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        CSV
                      </button>
                      <button
                        onClick={() => exportResults('json')}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <FileJson className="w-4 h-4" />
                        JSON
                      </button>
                      <button
                        onClick={copyResults}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        Copy
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Results Content */}
                <div className="max-h-96 overflow-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                      <span className="ml-2 text-gray-500">Executing query...</span>
                    </div>
                  ) : result?.error ? (
                    <div className="p-4">
                      <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700 dark:text-red-400">Query Error</p>
                          <p className="text-sm text-red-600 dark:text-red-300 mt-1 font-mono">{result.error}</p>
                        </div>
                      </div>
                    </div>
                  ) : result && result.columns.length > 0 ? (
                    viewMode === 'table' ? (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                          <tr>
                            {result.columns.map((col, i) => (
                              <th key={i} className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              {row.map((cell, j) => (
                                <td key={j} className="px-4 py-2 text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 font-mono">
                                  {cell === null ? (
                                    <span className="text-gray-400 italic">null</span>
                                  ) : typeof cell === 'object' ? (
                                    JSON.stringify(cell)
                                  ) : (
                                    String(cell)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <pre className="p-4 text-sm text-gray-900 dark:text-gray-100 font-mono overflow-auto">
                        {JSON.stringify(
                          result.rows.map(row => 
                            result.columns.reduce((obj, col, i) => ({ ...obj, [col]: row[i] }), {})
                          ),
                          null,
                          2
                        )}
                      </pre>
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Table2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                      <p>No results to display</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
