"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Check, Plus } from "lucide-react"
import Link from "next/link"
import { useSession } from "@/lib/auth-service"

interface Team {
  id: string
  name: string
  slug: string
}

export function TeamSwitcher({ currentTeamId }: { currentTeamId?: string }) {
  const { data: session } = useSession()
  const [teams, setTeams] = useState<Team[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const currentTeam = teams.find(t => t.id === currentTeamId) || teams[0]

  if (loading) {
    return (
      <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800"></div>
    )
  }

  if (teams.length === 0) {
    return (
      <Link href="/dashboard/teams">
        <button className="flex items-center space-x-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Team</span>
        </button>
      </Link>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between space-x-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-w-[200px]"
      >
        <span className="truncate">{currentTeam?.name || 'Select Team'}</span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="absolute top-12 left-0 z-20 w-64 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            <div className="max-h-64 overflow-y-auto p-2">
              <p className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                YOUR TEAMS
              </p>
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/dashboard?team=${team.id}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {team.name}
                  </span>
                  {team.id === currentTeamId && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </Link>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 p-2">
              <Link
                href="/dashboard/teams"
                onClick={() => setIsOpen(false)}
                className="flex items-center space-x-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Create Team
                </span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
