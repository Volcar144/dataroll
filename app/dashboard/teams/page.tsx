"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Settings, Users, Database, Plus, X, Search, Building2, ArrowRight, Sparkles } from "lucide-react"

interface Team {
  id: string
  name: string
  description?: string | null
  _count?: {
    members: number
    databaseConnections: number
  }
}

export default function TeamsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "" })
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchTeams()
    }
  }, [session])

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams')
      const data = await res.json()
      if (data.success) {
        setTeams(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load teams', error)
    } finally {
      setLoading(false)
    }
  }

  const submitNewTeam = async (event: FormEvent) => {
    event.preventDefault()
    setCreateError(null)

    if (!form.name.trim()) {
      setCreateError('Team name is required')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
      })

      const result = await response.json()
      if (response.ok && result.success) {
        setTeams((prev) => [result.data, ...prev])
        setForm({ name: "", description: "" })
        setCreateModalOpen(false)
      } else {
        setCreateError(result?.error?.message || 'Failed to create team')
      }
    } catch (error) {
      console.error('Failed to create team', error)
      setCreateError('Unexpected error creating team')
    } finally {
      setCreating(false)
    }
  }

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isPending || loading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
          <div className="relative z-10">
            <Skeleton className="h-8 w-24 mb-2 bg-white/20" />
            <Skeleton className="h-10 w-48 mb-2 bg-white/20" />
            <Skeleton className="h-5 w-64 bg-white/20" />
          </div>
        </div>
        
        {/* Cards skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48 mb-4" />
              <div className="flex gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-8">
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-3">
              <Building2 className="w-4 h-4" />
              Teams
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Your Teams
            </h1>
            <p className="text-white/80 max-w-md">
              Organize your projects and collaborate with team members on database migrations.
            </p>
          </div>
          <Button 
            onClick={() => setCreateModalOpen(true)}
            className="bg-white text-purple-600 hover:bg-white/90 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {/* Search */}
      {teams.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
          />
        </div>
      )}

      {/* Empty State */}
      {teams.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20" />
          <div className="relative z-10">
            <div className="mx-auto w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No teams yet
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-sm mx-auto">
              Teams help you organize database connections and collaborate with others. Create your first team to get started.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="w-4 h-4 mr-2" />
              Create your first team
            </Button>
          </div>
        </div>
      ) : filteredTeams.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Search className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
          <p className="text-zinc-600 dark:text-zinc-400">
            No teams match your search "{searchQuery}"
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => (
            <div 
              key={team.id} 
              className="group relative p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                  {team.name.charAt(0).toUpperCase()}
                </div>
                <Link href={`/dashboard/teams/${team.id}/settings`}>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                {team.name}
              </h2>
              {team.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                  {team.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>{team._count?.members ?? 0} member{(team._count?.members ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-4 h-4" />
                  <span>{team._count?.databaseConnections ?? 0} connection{(team._count?.databaseConnections ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <Link 
                href={`/dashboard/teams/${team.id}/settings`}
                className="inline-flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
              >
                Manage team
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div 
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-labelledby="modal-title"
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h3 id="modal-title" className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Create Team
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Add a new workspace for your projects and team members.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitNewTeam}>
              <div>
                <label htmlFor="team-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Team name <span className="text-red-500">*</span>
                </label>
                <input
                  id="team-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                  placeholder="Data Platform"
                />
              </div>

              <div>
                <label htmlFor="team-description" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Description <span className="text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="team-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow resize-none"
                  placeholder="What is this team for?"
                  rows={3}
                />
              </div>

              {createError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
                  <X className="w-4 h-4 flex-shrink-0" />
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

