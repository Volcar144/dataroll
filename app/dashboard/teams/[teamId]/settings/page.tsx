"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-service"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, Settings, Trash2, Shield, Mail, X, Check } from "lucide-react"

interface Team {
  id: string
  name: string
  slug: string
  description?: string | null
  createdAt: string
  createdById: string
}

interface TeamMember {
  id: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
  createdAt: string
}

import { use } from 'react'

export default function TeamSettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = use(params)
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'invitations' | 'danger'>('general')
  
  // General settings
  const [teamName, setTeamName] = useState("")
  const [teamDescription, setTeamDescription] = useState("")
  const [saving, setSaving] = useState(false)
  
  // Invitation modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<string>("DEVELOPER")
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  
  const teamId = resolvedParams.teamId

  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin')
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session && teamId) {
      fetchTeamData()
    }
  }, [session, teamId])

  const fetchTeamData = async () => {
    try {
      setLoading(true)
      let teamError = false;
      // Fetch team details
      const teamRes = await fetch(`/api/teams/${teamId}`)
      const teamData = await teamRes.json()
      if (teamData.success) {
        setTeam(teamData.data)
        setTeamName(teamData.data.name)
        setTeamDescription(teamData.data.description || "")
      } else {
        teamError = true;
      }
      // Fetch members
      const membersRes = await fetch(`/api/teams/${teamId}/members`)
      const membersData = await membersRes.json()
      if (membersData.success) {
        setMembers(membersData.data || [])
      }
      // Fetch invitations
      const invitesRes = await fetch(`/api/teams/${teamId}/invitations`)
      const invitesData = await invitesRes.json()
      if (invitesData.success) {
        setInvitations(invitesData.data || [])
      }
      if (teamError) {
        setTeam({
          id: teamId,
          name: 'Unknown Team',
          slug: '',
          description: 'Failed to load team',
          createdAt: '',
          createdById: '',
          error: true,
        } as any)
      }
    } catch (error) {
      setTeam({
        id: teamId,
        name: 'Unknown Team',
        slug: '',
        description: 'Failed to load team',
        createdAt: '',
        createdById: '',
        error: true,
      } as any)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          description: teamDescription
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setTeam(data.data)
      }
    } catch (error) {
      console.error('Failed to update team', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      })
      
      const data = await res.json()
      
      if (data.success) {
        setInvitations([...invitations, data.data])
        setInviteModalOpen(false)
        setInviteEmail("")
        setInviteRole("DEVELOPER")
      } else {
        setInviteError(data.message || 'Failed to send invitation')
      }
    } catch (error) {
      setInviteError('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return
    
    try {
      const res = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (data.success) {
        setMembers(members.filter(m => m.id !== memberId))
      }
    } catch (error) {
      console.error('Failed to remove member', error)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (data.success) {
        setInvitations(invitations.filter(i => i.id !== invitationId))
      }
    } catch (error) {
      console.error('Failed to cancel invitation', error)
    }
  }

  const handleDeleteTeam = async () => {
    if (!confirm('Are you sure you want to delete this team? This action cannot be undone.')) return
    if (!confirm('This will delete all connections, migrations, and data associated with this team. Type DELETE to confirm.')) return
    
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE'
      })
      
      const data = await res.json()
      
      if (data.success) {
        router.push('/dashboard/teams')
      }
    } catch (error) {
      console.error('Failed to delete team', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    )
  }
  if (team && (team as any).error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Failed to load team settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Unable to load team data. Please check your network or try again later.</p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg" onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Team Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {team ? `Manage ${team.name} settings and members` : 'Loading team settings...'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-8 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'general'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 mr-2" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users className="inline-block w-4 h-4 mr-2" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'invitations'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Mail className="inline-block w-4 h-4 mr-2" />
            Invitations ({invitations.filter(i => i.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'danger'
                ? 'text-red-600 dark:text-red-400 border-b-2 border-red-600 dark:border-red-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Trash2 className="inline-block w-4 h-4 mr-2" />
            Danger Zone
          </button>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Team Information
            </h2>
            <form onSubmit={handleUpdateTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team Slug
                </label>
                <input
                  type="text"
                  value={team?.slug || ''}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Team slug cannot be changed
                </p>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Team Members
              </h2>
              <Button onClick={() => setInviteModalOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Member
              </Button>
            </div>
            
            <div className="space-y-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {member.role}
                    </span>
                    {member.user.id !== team?.createdById && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitations Tab */}
        {activeTab === 'invitations' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Pending Invitations
            </h2>
            
            {invitations.filter(i => i.status === 'PENDING').length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No pending invitations
              </p>
            ) : (
              <div className="space-y-4">
                {invitations
                  .filter(i => i.status === 'PENDING')
                  .map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Invited {new Date(invitation.createdAt).toLocaleDateString()} • Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                          {invitation.role}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Danger Zone Tab */}
        {activeTab === 'danger' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 border-2 border-red-200 dark:border-red-900">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6">
              Danger Zone
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Delete Team
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Once you delete a team, there is no going back. This will delete all connections,
                  migrations, audit logs, and other data associated with this team.
                </p>
                <Button
                  onClick={handleDeleteTeam}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Team
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Invite Team Member
              </h3>
              <button
                onClick={() => {
                  setInviteModalOpen(false)
                  setInviteError(null)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="VIEWER">Viewer - Can view resources</option>
                  <option value="DEVELOPER">Developer - Can create and execute</option>
                  <option value="ADMIN">Admin - Full access except deletion</option>
                </select>
              </div>
              
              {inviteError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {inviteError}
                </p>
              )}
              
              <div className="flex space-x-3 pt-4">
                <Button type="submit" disabled={inviting} className="flex-1">
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setInviteModalOpen(false)
                    setInviteError(null)
                  }}
                  disabled={inviting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
