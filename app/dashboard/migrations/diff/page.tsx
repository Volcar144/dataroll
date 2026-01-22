"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "@/lib/auth-service"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { 
  ArrowLeft,
  GitCompare,
  Loader2,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  Equal,
  FileCode,
  Table2,
  Columns,
  Key,
  Database,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ArrowLeftRight,
  Search,
  Filter,
  Maximize2
} from "lucide-react"

interface SchemaObject {
  type: 'table' | 'column' | 'index' | 'constraint' | 'view' | 'function'
  name: string
  definition?: string
  columns?: ColumnDef[]
  indexes?: IndexDef[]
  constraints?: ConstraintDef[]
}

interface ColumnDef {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  references?: string
}

interface IndexDef {
  name: string
  columns: string[]
  unique: boolean
  type?: string
}

interface ConstraintDef {
  name: string
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK'
  columns: string[]
  references?: string
}

interface DiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  objectType: 'table' | 'column' | 'index' | 'constraint' | 'view'
  name: string
  tableName?: string
  before?: any
  after?: any
  changes?: string[]
}

interface Migration {
  id: string
  name: string
  sql: string
  createdAt: string
  status: string
}

// Parse SQL to extract schema changes
function parseSQLChanges(sql: string): DiffResult[] {
  const changes: DiffResult[] = []
  const lines = sql.split('\n')
  
  // Patterns for different DDL statements
  const createTablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/i
  const dropTablePattern = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/i
  const alterTablePattern = /ALTER\s+TABLE\s+["']?(\w+)["']?/i
  const addColumnPattern = /ADD\s+(?:COLUMN\s+)?["']?(\w+)["']?\s+(\w+(?:\([^)]+\))?)/i
  const dropColumnPattern = /DROP\s+(?:COLUMN\s+)?["']?(\w+)["']?/i
  const createIndexPattern = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s+ON\s+["']?(\w+)["']?/i
  const dropIndexPattern = /DROP\s+INDEX\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/i
  const addConstraintPattern = /ADD\s+CONSTRAINT\s+["']?(\w+)["']?\s+(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)/i
  const dropConstraintPattern = /DROP\s+CONSTRAINT\s+["']?(\w+)["']?/i
  
  let currentStatement = ''
  let currentTable = ''
  
  for (const line of lines) {
    currentStatement += ' ' + line.trim()
    
    // Check for CREATE TABLE
    const createMatch = currentStatement.match(createTablePattern)
    if (createMatch) {
      changes.push({
        type: 'added',
        objectType: 'table',
        name: createMatch[1],
        after: { sql: currentStatement.trim() },
      })
    }
    
    // Check for DROP TABLE
    const dropMatch = currentStatement.match(dropTablePattern)
    if (dropMatch) {
      changes.push({
        type: 'removed',
        objectType: 'table',
        name: dropMatch[1],
        before: { name: dropMatch[1] },
      })
    }
    
    // Check for ALTER TABLE
    const alterMatch = currentStatement.match(alterTablePattern)
    if (alterMatch) {
      currentTable = alterMatch[1]
      
      // Check for ADD COLUMN
      const addColMatch = currentStatement.match(addColumnPattern)
      if (addColMatch) {
        changes.push({
          type: 'added',
          objectType: 'column',
          name: addColMatch[1],
          tableName: currentTable,
          after: { type: addColMatch[2] },
        })
      }
      
      // Check for DROP COLUMN
      const dropColMatch = currentStatement.match(dropColumnPattern)
      if (dropColMatch) {
        changes.push({
          type: 'removed',
          objectType: 'column',
          name: dropColMatch[1],
          tableName: currentTable,
        })
      }
      
      // Check for ADD CONSTRAINT
      const addConstMatch = currentStatement.match(addConstraintPattern)
      if (addConstMatch) {
        changes.push({
          type: 'added',
          objectType: 'constraint',
          name: addConstMatch[1],
          tableName: currentTable,
          after: { type: addConstMatch[2] },
        })
      }
      
      // Check for DROP CONSTRAINT
      const dropConstMatch = currentStatement.match(dropConstraintPattern)
      if (dropConstMatch) {
        changes.push({
          type: 'removed',
          objectType: 'constraint',
          name: dropConstMatch[1],
          tableName: currentTable,
        })
      }
    }
    
    // Check for CREATE INDEX
    const createIdxMatch = currentStatement.match(createIndexPattern)
    if (createIdxMatch) {
      changes.push({
        type: 'added',
        objectType: 'index',
        name: createIdxMatch[1],
        tableName: createIdxMatch[2],
        after: { unique: /UNIQUE/i.test(currentStatement) },
      })
    }
    
    // Check for DROP INDEX
    const dropIdxMatch = currentStatement.match(dropIndexPattern)
    if (dropIdxMatch) {
      changes.push({
        type: 'removed',
        objectType: 'index',
        name: dropIdxMatch[1],
      })
    }
    
    // Reset statement on semicolon
    if (currentStatement.includes(';')) {
      currentStatement = ''
    }
  }
  
  return changes
}

// Generate line-by-line diff for SQL
function generateSQLDiff(before: string, after: string): { line: string; type: 'added' | 'removed' | 'unchanged' }[] {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  const result: { line: string; type: 'added' | 'removed' | 'unchanged' }[] = []
  
  // Simple line-by-line comparison (for a real diff, use a proper diff algorithm)
  const maxLength = Math.max(beforeLines.length, afterLines.length)
  
  for (let i = 0; i < maxLength; i++) {
    const beforeLine = beforeLines[i]
    const afterLine = afterLines[i]
    
    if (beforeLine === afterLine) {
      result.push({ line: afterLine || '', type: 'unchanged' })
    } else if (!beforeLine) {
      result.push({ line: afterLine, type: 'added' })
    } else if (!afterLine) {
      result.push({ line: beforeLine, type: 'removed' })
    } else {
      result.push({ line: beforeLine, type: 'removed' })
      result.push({ line: afterLine, type: 'added' })
    }
  }
  
  return result
}

export default function DiffViewerPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null)
  const [compareMigration, setCompareMigration] = useState<Migration | null>(null)
  const [diffResults, setDiffResults] = useState<DiffResult[]>([])
  const [viewMode, setViewMode] = useState<'split' | 'unified' | 'visual'>('visual')
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'added' | 'removed' | 'modified'>('all')
  const [copied, setCopied] = useState(false)
  const [showOnlyChanges, setShowOnlyChanges] = useState(true)
  
  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchMigrations()
    }
  }, [session])

  useEffect(() => {
    if (selectedMigration) {
      const changes = parseSQLChanges(selectedMigration.sql)
      setDiffResults(changes)
    }
  }, [selectedMigration])

  const fetchMigrations = async () => {
    try {
      setLoading(true)
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      const teamId = teams.data?.[0]?.id
      
      if (teamId) {
        const migrationsRes = await fetch(`/api/migrations?teamId=${teamId}`)
        const migrationsData = await migrationsRes.json()
        setMigrations(migrationsData.data || [])
        
        // Auto-select first migration
        if (migrationsData.data?.length > 0) {
          setSelectedMigration(migrationsData.data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch migrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables)
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName)
    } else {
      newExpanded.add(tableName)
    }
    setExpandedTables(newExpanded)
  }

  const filteredResults = useMemo(() => {
    let results = diffResults
    
    if (filterType !== 'all') {
      results = results.filter(r => r.type === filterType)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      results = results.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.tableName?.toLowerCase().includes(query)
      )
    }
    
    return results
  }, [diffResults, filterType, searchQuery])

  const copySQL = () => {
    if (selectedMigration) {
      navigator.clipboard.writeText(selectedMigration.sql)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'removed':
        return <Minus className="w-4 h-4 text-red-500" />
      case 'modified':
        return <ArrowLeftRight className="w-4 h-4 text-amber-500" />
      default:
        return <Equal className="w-4 h-4 text-gray-400" />
    }
  }

  const getObjectIcon = (objectType: string) => {
    switch (objectType) {
      case 'table':
        return <Table2 className="w-4 h-4" />
      case 'column':
        return <Columns className="w-4 h-4" />
      case 'index':
        return <Key className="w-4 h-4" />
      case 'constraint':
        return <Key className="w-4 h-4" />
      default:
        return <Database className="w-4 h-4" />
    }
  }

  const stats = useMemo(() => {
    return {
      added: diffResults.filter(r => r.type === 'added').length,
      removed: diffResults.filter(r => r.type === 'removed').length,
      modified: diffResults.filter(r => r.type === 'modified').length,
    }
  }, [diffResults])

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
                href="/dashboard/migrations" 
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GitCompare className="w-6 h-6" />
                  Migration Diff Viewer
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Visualize schema changes in migrations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Migration List */}
          <aside className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">Migrations</h2>
                <p className="text-xs text-gray-500 mt-1">Select a migration to view changes</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600 mx-auto" />
                </div>
              ) : migrations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileCode className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                  <p>No migrations found</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto">
                  {migrations.map((migration) => (
                    <button
                      key={migration.id}
                      onClick={() => setSelectedMigration(migration)}
                      className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                        selectedMigration?.id === migration.id
                          ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-500'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {migration.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          migration.status === 'applied'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : migration.status === 'pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {migration.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(migration.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {selectedMigration ? (
              <>
                {/* Toolbar */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      {/* View Mode Toggle */}
                      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <button
                          onClick={() => setViewMode('visual')}
                          className={`px-3 py-1.5 text-sm ${viewMode === 'visual' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          Visual
                        </button>
                        <button
                          onClick={() => setViewMode('split')}
                          className={`px-3 py-1.5 text-sm ${viewMode === 'split' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          Split
                        </button>
                        <button
                          onClick={() => setViewMode('unified')}
                          className={`px-3 py-1.5 text-sm ${viewMode === 'unified' ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                        >
                          Unified
                        </button>
                      </div>
                      
                      {/* Filter */}
                      <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <select
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value as any)}
                          className="text-sm px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                        >
                          <option value="all">All Changes</option>
                          <option value="added">Added ({stats.added})</option>
                          <option value="removed">Removed ({stats.removed})</option>
                          <option value="modified">Modified ({stats.modified})</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                      </div>
                      
                      {/* Copy */}
                      <button
                        onClick={copySQL}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        Copy SQL
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{stats.added} added</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Minus className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{stats.removed} removed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{stats.modified} modified</span>
                    </div>
                  </div>
                </div>

                {/* Diff Content */}
                {viewMode === 'visual' ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    {filteredResults.length === 0 ? (
                      <div className="p-12 text-center text-gray-500">
                        <Info className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p>No schema changes detected</p>
                        <p className="text-sm mt-1">This migration may contain data changes or no structural modifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-800">
                        {filteredResults.map((result, index) => (
                          <div
                            key={`${result.objectType}-${result.name}-${index}`}
                            className={`${
                              result.type === 'added'
                                ? 'bg-green-50/50 dark:bg-green-900/10'
                                : result.type === 'removed'
                                ? 'bg-red-50/50 dark:bg-red-900/10'
                                : result.type === 'modified'
                                ? 'bg-amber-50/50 dark:bg-amber-900/10'
                                : ''
                            }`}
                          >
                            <button
                              onClick={() => result.objectType === 'table' && toggleTable(result.name)}
                              className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              {getChangeIcon(result.type)}
                              <span className="text-gray-400">{getObjectIcon(result.objectType)}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">
                                    {result.name}
                                  </span>
                                  {result.tableName && (
                                    <span className="text-xs text-gray-500">
                                      on <span className="font-mono">{result.tableName}</span>
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500 capitalize">
                                  {result.objectType} • {result.type}
                                </span>
                              </div>
                              {result.objectType === 'table' && (
                                <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedTables.has(result.name) ? 'rotate-90' : ''}`} />
                              )}
                            </button>
                            
                            {result.objectType === 'table' && expandedTables.has(result.name) && result.after?.sql && (
                              <div className="px-4 pb-4">
                                <pre className="p-4 rounded-lg bg-gray-900 dark:bg-black text-sm font-mono overflow-x-auto text-green-400">
                                  {result.after.sql}
                                </pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : viewMode === 'unified' ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-medium text-gray-900 dark:text-white">{selectedMigration.name}</h3>
                    </div>
                    <pre className="p-4 text-sm font-mono overflow-x-auto max-h-[600px] overflow-y-auto">
                      {selectedMigration.sql.split('\n').map((line, i) => {
                        const isAdd = line.trim().startsWith('CREATE') || line.trim().startsWith('ADD') || line.trim().startsWith('INSERT')
                        const isDrop = line.trim().startsWith('DROP') || line.trim().startsWith('DELETE')
                        
                        return (
                          <div
                            key={i}
                            className={`${
                              isAdd
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : isDrop
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                : 'text-gray-800 dark:text-gray-200'
                            } px-2 -mx-2`}
                          >
                            <span className="text-gray-400 select-none mr-4">{String(i + 1).padStart(3, ' ')}</span>
                            {line}
                          </div>
                        )
                      })}
                    </pre>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Before */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-red-50 dark:bg-red-900/20">
                        <h3 className="font-medium text-red-800 dark:text-red-300">Before</h3>
                      </div>
                      <pre className="p-4 text-sm font-mono overflow-x-auto max-h-[500px] overflow-y-auto text-gray-500">
                        {compareMigration?.sql || '-- Select a previous migration to compare'}
                      </pre>
                    </div>
                    
                    {/* After */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-green-50 dark:bg-green-900/20">
                        <h3 className="font-medium text-green-800 dark:text-green-300">After</h3>
                      </div>
                      <pre className="p-4 text-sm font-mono overflow-x-auto max-h-[500px] overflow-y-auto text-gray-800 dark:text-gray-200">
                        {selectedMigration.sql}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Impact Analysis */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Impact Analysis
                  </h3>
                  <div className="space-y-2 text-sm">
                    {stats.removed > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Data Loss Warning</p>
                          <p className="text-red-600 dark:text-red-400 mt-0.5">
                            This migration removes {stats.removed} object(s). This may result in permanent data loss.
                          </p>
                        </div>
                      </div>
                    )}
                    {stats.added > 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Schema Addition</p>
                          <p className="text-green-600 dark:text-green-400 mt-0.5">
                            This migration adds {stats.added} new object(s) to the schema.
                          </p>
                        </div>
                      </div>
                    )}
                    {stats.added === 0 && stats.removed === 0 && stats.modified === 0 && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">No Structural Changes</p>
                          <p className="text-gray-600 dark:text-gray-400 mt-0.5">
                            This migration contains data modifications or no detectable schema changes.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
                <GitCompare className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Select a Migration
                </h3>
                <p className="text-gray-500">
                  Choose a migration from the sidebar to view its schema changes
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
