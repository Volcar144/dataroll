"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"

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

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="mt-2 text-gray-500">Manage your teams and team members</p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          Create Team
        </Button>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-lg bg-gray-50 py-12 text-center dark:bg-slate-900">
          <p className="text-gray-500">No teams yet.</p>
          <div className="mt-4">
            <Button onClick={() => setCreateModalOpen(true)}>Create your first team</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <div key={team.id} className="p-6 transition-shadow rounded-lg border hover:shadow-md dark:border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold">{team.name}</h2>
                  {team.description && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{team.description}</p>
                  )}
                  <div className="mt-4 flex gap-4 text-sm text-gray-500">
                    <span>{team._count?.members ?? 0} member{(team._count?.members ?? 0) !== 1 ? 's' : ''}</span>
                    <span>{team._count?.databaseConnections ?? 0} connection{(team._count?.databaseConnections ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Link href={`/dashboard/teams/${team.id}/settings`}>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Create Team</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Add a new workspace for your projects.</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <form className="space-y-4" onSubmit={submitNewTeam}>
              <label className="block space-y-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-200">Team name</span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="Data Platform"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-zinc-700 dark:text-zinc-200">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
                  placeholder="What is this team for?"
                  rows={3}
                />
              </label>

              {createError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/40">
                  {createError}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
