"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface DatabaseConnection {
  id: string
  name: string
  type: string
  host: string
  database: string
  isActive: boolean
  createdAt: string
}

export default function ConnectionsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [connections, setConnections] = useState<DatabaseConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchConnections()
    }
  }, [session])

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/connections')
      const data = await response.json()
      if (data.success) {
        setConnections(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async (connection: DatabaseConnection) => {
    setTestingConnection(connection.id)
    try {
      const response = await fetch('/api/connections/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId: connection.id,
        }),
      })

      const result = await response.json()
      if (result.success) {
        alert(result.data.connected ? 'Connection successful!' : `Connection failed: ${result.data.error}`)
      } else {
        alert('Connection test failed')
      }
    } catch (error) {
      alert('Connection test failed')
    } finally {
      setTestingConnection(null)
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Database Connections
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Manage your database connections
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Back to Dashboard
              </Link>
              <button className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Add Connection
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connections.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              No database connections
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Get started by adding your first database connection.
            </p>
            <button className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Add Connection
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Your Connections
              </h2>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {connections.map((connection) => (
                <div key={connection.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${connection.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {connection.name}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {connection.type} • {connection.host} • {connection.database}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => testConnection(connection)}
                      disabled={testingConnection === connection.id}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {testingConnection === connection.id ? 'Testing...' : 'Test'}
                    </button>
                    <button className="px-3 py-1 text-sm bg-zinc-600 text-white rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500">
                      Edit
                    </button>
                    <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}