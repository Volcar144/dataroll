"use client"

import { useEffect, useMemo, useState, FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Activity, AlertCircle, AlertTriangle, CheckCircle2, Circle, Copy, Database, Gauge, Plug2, RefreshCw, ShieldCheck } from "lucide-react"

type Connection = {
  id: string
  name: string
  type: "POSTGRESQL" | "MYSQL" | "SQLITE"
  host: string
  port?: number | null
  database: string
  username: string
  ssl: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

type HealthStatus = {
  id: string
  healthStatus: "HEALTHY" | "UNHEALTHY" | "UNKNOWN" | null
  lastHealthCheck: string | null
  recentErrorsCount: number
}

type TestResult = {
  connected: boolean
  latency?: number
  error?: string
}

const typeAccent: Record<Connection["type"], string> = {
  POSTGRESQL: "bg-sky-500/20 text-sky-400",
  MYSQL: "bg-amber-500/20 text-amber-400",
  SQLITE: "bg-emerald-500/20 text-emerald-400",
}

export default function ConnectionsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>("")
  const [connections, setConnections] = useState<Connection[]>([])
  const [healthById, setHealthById] = useState<Record<string, HealthStatus>>({})
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})
  const [checking, setChecking] = useState<Record<string, boolean>>({})
  const [proxyGenerating, setProxyGenerating] = useState<Record<string, boolean>>({})
  const [proxyLinks, setProxyLinks] = useState<Record<string, { proxyUrl: string; createdAt: string }>>({})
  const [proxyErrors, setProxyErrors] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [csrfToken, setCsrfToken] = useState<string>("")
  const [form, setForm] = useState({
    name: "",
    type: "POSTGRESQL" as Connection["type"],
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: "",
    ssl: true,
    url: "",
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchCsrf()
      loadConnections()
    }
  }, [session])

  const fetchCsrf = async () => {
    try {
      const res = await fetch("/api/csrf")
      const data = await res.json()
      if (data?.token) {
        setCsrfToken(data.token)
      }
    } catch (err) {
      console.error("Failed to fetch CSRF token", err)
    }
  }

  const loadConnections = async () => {
    setLoading(true)
    setError(null)
    try {
      const teamsRes = await fetch("/api/teams")
      const teamsJson = await teamsRes.json()
      const firstTeam = teamsJson?.data?.[0]

      if (!firstTeam?.id) {
        setError("You need a team to manage connections.")
        setConnections([])
        return
      }

      setTeamId(firstTeam.id)
      setTeamName(firstTeam.name || "Team")

      const res = await fetch(`/api/connections?teamId=${firstTeam.id}`)
      const data = await res.json()

      if (!res.ok || !data?.success) {
        setError(data?.error?.message || "Unable to load connections")
        setConnections([])
        return
      }

      const connectionList: Connection[] = data.data || []
      setConnections(connectionList)

      if (connectionList.length > 0) {
        await loadHealth(connectionList.map((c) => c.id))
      }
    } catch (err) {
      console.error("Failed to load connections", err)
      setError("Unexpected error loading connections")
    } finally {
      setLoading(false)
    }
  }

  const loadHealth = async (ids: string[]) => {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await fetch(`/api/connections/${id}/monitoring?action=health`)
          const data = await res.json()
          if (res.ok && data?.success) {
            return { id, payload: data.data as HealthStatus }
          }
        } catch (err) {
          console.error("Failed to load health for", id, err)
        }
        return null
      })
    )

    setHealthById((prev) => {
      const next = { ...prev }
      results.forEach((item) => {
        if (item) {
          next[item.id] = item.payload
        }
      })
      return next
    })
  }

  const handleTestConnection = async (connectionId: string) => {
    setTesting((prev) => ({ ...prev, [connectionId]: true }))
    setTestResults((prev) => ({ ...prev, [connectionId]: { connected: false } }))
    try {
      const res = await fetch("/api/connections/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId }),
      })

      const data = await res.json()
      if (res.ok && data?.success) {
        setTestResults((prev) => ({ ...prev, [connectionId]: data.data as TestResult }))
      } else {
        setTestResults((prev) => ({ ...prev, [connectionId]: { connected: false, error: data?.error?.message || "Test failed" } }))
      }
    } catch (err) {
      console.error("Test connection failed", err)
      setTestResults((prev) => ({ ...prev, [connectionId]: { connected: false, error: "Unexpected error" } }))
    } finally {
      setTesting((prev) => ({ ...prev, [connectionId]: false }))
    }
  }

  const handleHealthCheck = async (connectionId: string) => {
    setChecking((prev) => ({ ...prev, [connectionId]: true }))
    try {
      await fetch(`/api/connections/${connectionId}/monitoring`, { method: "POST" })
      await loadHealth([connectionId])
    } catch (err) {
      console.error("Health check failed", err)
    } finally {
      setChecking((prev) => ({ ...prev, [connectionId]: false }))
    }
  }

  const handleCreateProxyUrl = async (connectionId: string) => {
    setProxyErrors((prev) => ({ ...prev, [connectionId]: null }))
    setProxyGenerating((prev) => ({ ...prev, [connectionId]: true }))
    try {
      const res = await fetch(`/api/connections/${connectionId}/proxy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connectionId }),
      })

      const data = await res.json()
      if (res.ok && data?.success && data.proxyUrl) {
        setProxyLinks((prev) => ({
          ...prev,
          [connectionId]: { proxyUrl: data.proxyUrl as string, createdAt: new Date().toISOString() },
        }))
      } else {
        setProxyErrors((prev) => ({ ...prev, [connectionId]: data?.error || "Unable to create proxy" }))
      }
    } catch (err) {
      setProxyErrors((prev) => ({ ...prev, [connectionId]: "Unexpected error creating proxy" }))
    } finally {
      setProxyGenerating((prev) => ({ ...prev, [connectionId]: false }))
    }
  }

  const handleCreateConnection = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError(null)

    if (!teamId) {
      setCreateError("Select a team before creating a connection")
      return
    }

    const portNumber = form.port ? Number(form.port) : undefined
    if (portNumber !== undefined && Number.isNaN(portNumber)) {
      setCreateError("Port must be a valid number")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          type: form.type,
          host: form.host.trim(),
          port: portNumber,
          database: form.database.trim(),
          username: form.username.trim(),
          password: form.password,
          ssl: form.ssl,
          url: form.url.trim() || undefined,
          teamId,
        }),
      })

      const data = await res.json()
      if (res.ok && data?.success) {
        const newConnection: Connection = data.data
        // Prepend to keep newest visible without reloading
        setConnections((prev) => [newConnection, ...prev])
        setForm({
          name: "",
          type: "POSTGRESQL",
          host: "",
          port: "5432",
          database: "",
          username: "",
          password: "",
          ssl: true,
          url: "",
        })
        setCreateModalOpen(false)
        await loadHealth([newConnection.id])
      } else {
        setCreateError(data?.error?.message || "Failed to create connection")
      }
    } catch (err) {
      console.error("Create connection failed", err)
      setCreateError("Unexpected error creating connection")
    } finally {
      setCreating(false)
    }
  }

  const healthyCount = useMemo(
    () => Object.values(healthById).filter((h) => h.healthStatus === "HEALTHY").length,
    [healthById],
  )

  const unhealthyCount = useMemo(
    () => Object.values(healthById).filter((h) => h.healthStatus === "UNHEALTHY").length,
    [healthById],
  )

  const unknownCount = useMemo(
    () => Object.values(healthById).filter((h) => !h.healthStatus || h.healthStatus === "UNKNOWN").length,
    [healthById],
  )

  if (isPending || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, idx) => (
            <Skeleton key={idx} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-200">
              <Plug2 className="h-3.5 w-3.5" />
              Connections
            </div>
            <div>
              <h1 className="text-3xl font-semibold md:text-4xl">Minimal connection cockpit</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-200">
                Track live health, run quick tests, and add databases without leaving the dashboard. Keeping it lean, no back buttons.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <ShieldCheck className="h-4 w-4 text-emerald-300" /> Healthy {healthyCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <AlertTriangle className="h-4 w-4 text-amber-300" /> At risk {unhealthyCount}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                <Circle className="h-4 w-4 text-slate-200" /> Unknown {unknownCount}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100" onClick={() => loadConnections()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button className="bg-emerald-500 text-emerald-950 hover:bg-emerald-400" onClick={() => setCreateModalOpen(true)}>
              Add connection
            </Button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Healthy</p>
                <p className="text-2xl font-semibold text-slate-900">{healthyCount}</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {teamName || "Team"}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-500">Connections responding without errors.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Needs attention</p>
              <p className="text-2xl font-semibold text-slate-900">{unhealthyCount}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Recent failures or health checks marked unhealthy.</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total connections</p>
              <p className="text-2xl font-semibold text-slate-900">{connections.length}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-500">Across all database types.</p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {connections.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-600">
            No connections yet. Start by adding one.
          </div>
        ) : (
          connections.map((connection) => {
            const health = healthById[connection.id]
            const test = testResults[connection.id]
            const status = health?.healthStatus || "UNKNOWN"

            const statusAccent = status === "HEALTHY"
              ? "text-emerald-600 bg-emerald-50"
              : status === "UNHEALTHY"
                ? "text-rose-600 bg-rose-50"
                : "text-slate-600 bg-slate-100"

            return (
              <div key={connection.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${typeAccent[connection.type]}`}>
                        <Database className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-xs uppercase text-slate-500">{connection.type}</p>
                        <h3 className="text-lg font-semibold text-slate-900">{connection.name}</h3>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                        <Plug2 className="h-4 w-4" />
                        {connection.host}{connection.port ? `:${connection.port}` : ""}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                        <Activity className="h-4 w-4" />
                        DB {connection.database}
                      </span>
                      {connection.ssl && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                          <ShieldCheck className="h-4 w-4" /> SSL
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusAccent}`}>
                    {status === "HEALTHY" && <CheckCircle2 className="h-4 w-4" />}
                    {status === "UNHEALTHY" && <AlertTriangle className="h-4 w-4" />}
                    {status === "UNKNOWN" && <Circle className="h-4 w-4" />}
                    {status || "UNKNOWN"}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Last health check</p>
                    <p className="mt-1 font-medium text-slate-900">
                      {health?.lastHealthCheck ? new Date(health.lastHealthCheck).toLocaleString() : "Not yet"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Errors (24h): {health?.recentErrorsCount ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">Latest test</p>
                    {test ? (
                      <div className="mt-1 space-y-1">
                        <p className={`font-medium ${test.connected ? "text-emerald-700" : "text-rose-700"}`}>
                          {test.connected ? "Connected" : "Failed"}
                        </p>
                        {test.latency !== undefined && (
                          <p className="text-xs text-slate-500">Latency: {test.latency}ms</p>
                        )}
                        {test.error && (
                          <p className="text-xs text-rose-600">{test.error}</p>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-slate-500">No tests run yet.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={testing[connection.id]}
                    onClick={() => handleTestConnection(connection.id)}
                  >
                    {testing[connection.id] ? "Testing…" : "Test connection"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={checking[connection.id]}
                    onClick={() => handleHealthCheck(connection.id)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {checking[connection.id] ? "Checking…" : "Health check"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={proxyGenerating[connection.id]}
                    onClick={() => handleCreateProxyUrl(connection.id)}
                  >
                    {proxyGenerating[connection.id] ? "Preparing proxy…" : "Create proxy URL"}
                  </Button>
                  <Link href="/dashboard/monitoring" className="text-sm font-medium text-slate-700 underline hover:text-slate-900">
                    View monitoring
                  </Link>
                </div>

                {(proxyLinks[connection.id] || proxyErrors[connection.id]) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                    {proxyLinks[connection.id] && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-slate-500">Proxy URL</p>
                            <p className="break-all font-mono text-xs text-slate-900">{proxyLinks[connection.id].proxyUrl}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard?.writeText(proxyLinks[connection.id].proxyUrl)}
                          >
                            <Copy className="mr-2 h-4 w-4" /> Copy
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500">Share this URL with teammates who need a tunneled connection. It is scoped to this database only.</p>
                      </div>
                    )}
                    {proxyErrors[connection.id] && (
                      <p className="text-xs text-rose-600">{proxyErrors[connection.id]}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </section>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">New connection</h3>
                <p className="text-sm text-slate-500">Keep inputs minimal; only the essentials to get online.</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>

            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleCreateConnection}>
              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="Primary database"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Type</span>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as Connection["type"] })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                >
                  <option value="POSTGRESQL">PostgreSQL</option>
                  <option value="MYSQL">MySQL</option>
                  <option value="SQLITE">SQLite</option>
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Host</span>
                <input
                  required
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="db.internal"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Port</span>
                <input
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="5432"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Database</span>
                <input
                  required
                  value={form.database}
                  onChange={(e) => setForm({ ...form, database: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="app_db"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Username</span>
                <input
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="admin"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Password</span>
                <input
                  required
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="••••••••"
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="text-slate-700">Connection URL (optional)</span>
                <input
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-slate-400 focus:outline-none"
                  placeholder="postgres://user:pass@host:5432/db"
                />
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.ssl}
                  onChange={(e) => setForm({ ...form, ssl: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Use SSL
              </label>

              {createError && (
                <div className="md:col-span-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {createError}
                </div>
              )}

              <div className="md:col-span-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {creating ? "Saving…" : "Save connection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

