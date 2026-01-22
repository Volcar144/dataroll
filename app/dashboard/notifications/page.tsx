"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth-service"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import { 
  Bell, 
  ArrowLeft, 
  Check, 
  CheckCheck, 
  Archive, 
  Trash2, 
  Filter, 
  Search, 
  ExternalLink,
  Loader2,
  Inbox,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  Workflow,
  Settings
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  archived: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

interface NotificationResponse {
  notifications: Notification[]
  totalCount: number
  unreadCount: number
  hasMore: boolean
}

const notificationTypes = [
  { value: 'all', label: 'All Notifications', icon: Bell },
  { value: 'approval_request', label: 'Approval Requests', icon: Clock },
  { value: 'approval_response', label: 'Approval Responses', icon: CheckCircle2 },
  { value: 'workflow_success', label: 'Workflow Success', icon: Workflow },
  { value: 'workflow_failure', label: 'Workflow Failures', icon: AlertCircle },
  { value: 'team_invite', label: 'Team Invites', icon: Users },
  { value: 'system', label: 'System', icon: Settings },
]

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  approval_request: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  approval_response: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  workflow_success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  workflow_failure: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  team_invite: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  migration_complete: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
  migration_failed: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  system: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800' },
}

export default function NotificationsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedType, setSelectedType] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      const offset = reset ? 0 : notifications.length
      const response = await fetch(`/api/notifications?limit=20&offset=${offset}`)
      
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data: NotificationResponse = await response.json()
      
      if (reset) {
        setNotifications(data.notifications)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
      }
      setUnreadCount(data.unreadCount)
      setTotalCount(data.totalCount)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [notifications.length])

  useEffect(() => {
    if (session) {
      fetchNotifications(true)
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'read' }),
      })
      
      setNotifications(prev => 
        prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - ids.filter(id => 
        notifications.find(n => n.id === id && !n.read)
      ).length))
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [], action: 'read_all' }),
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const archiveNotifications = async (ids: string[]) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'archive' }),
      })
      
      const archivedNotifications = notifications.filter(n => ids.includes(n.id))
      const unreadArchived = archivedNotifications.filter(n => !n.read).length
      
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
      setUnreadCount(prev => Math.max(0, prev - unreadArchived))
      setTotalCount(prev => prev - ids.length)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error archiving notifications:', error)
    }
  }

  const deleteNotifications = async (ids: string[]) => {
    try {
      await fetch(`/api/notifications?ids=${ids.join(',')}`, {
        method: 'DELETE',
      })
      
      const deletedNotifications = notifications.filter(n => ids.includes(n.id))
      const unreadDeleted = deletedNotifications.filter(n => !n.read).length
      
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)))
      setUnreadCount(prev => Math.max(0, prev - unreadDeleted))
      setTotalCount(prev => prev - ids.length)
      setSelectedIds(new Set())
    } catch (error) {
      console.error('Error deleting notifications:', error)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const filteredIds = filteredNotifications.map(n => n.id)
    setSelectedIds(new Set(filteredIds))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const getTypeColor = (type: string) => {
    return typeColors[type] || typeColors.system
  }

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesType = selectedType === 'all' || n.type === selectedType
    const matchesSearch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesType && matchesSearch
  })

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
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'} · {totalCount} total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link
                href="/profile"
                className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Filter by Type</h3>
              <nav className="space-y-1">
                {notificationTypes.map((type) => {
                  const Icon = type.icon
                  const isSelected = selectedType === type.value
                  return (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {type.label}
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search and Actions Bar */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                
                {/* Bulk Actions */}
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 ? (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedIds.size} selected
                      </span>
                      <button
                        onClick={clearSelection}
                        className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => markAsRead(Array.from(selectedIds))}
                        className="px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" /> Read
                      </button>
                      <button
                        onClick={() => archiveNotifications(Array.from(selectedIds))}
                        className="px-3 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Archive className="w-4 h-4" /> Archive
                      </button>
                      <button
                        onClick={() => deleteNotifications(Array.from(selectedIds))}
                        className="px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={selectAll}
                        className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        Select All
                      </button>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="px-3 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <CheckCheck className="w-4 h-4" /> Mark All Read
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                    <Inbox className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {searchQuery ? 'No matching notifications' : 'No notifications yet'}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    {searchQuery 
                      ? 'Try adjusting your search or filters.'
                      : 'When you receive notifications, they will appear here.'
                    }
                  </p>
                </div>
              ) : (
                <>
                  {filteredNotifications.map((notification, index) => {
                    const colors = getTypeColor(notification.type)
                    const isSelected = selectedIds.has(notification.id)
                    
                    return (
                      <div
                        key={notification.id}
                        className={`group flex items-start gap-4 px-6 py-4 border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors ${
                          isSelected 
                            ? 'bg-violet-50 dark:bg-violet-900/20' 
                            : !notification.read 
                            ? 'bg-gray-50/50 dark:bg-gray-800/30'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="pt-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(notification.id)}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-violet-600 focus:ring-violet-500"
                          />
                        </div>
                        
                        {/* Type Badge */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                          <div className={`w-2.5 h-2.5 rounded-full ${colors.text.replace('text-', 'bg-').replace('-700', '-500').replace('-400', '-500')}`} />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className={`font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {notification.title}
                                </h4>
                                {!notification.read && (
                                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-gray-400 dark:text-gray-500">
                                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                                  {notification.type.replace(/_/g, ' ')}
                                </span>
                                {notification.link && (
                                  <a
                                    href={notification.link}
                                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                    onClick={() => {
                                      if (!notification.read) markAsRead([notification.id])
                                    }}
                                  >
                                    View details <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead([notification.id])}
                                  className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => archiveNotifications([notification.id])}
                                className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                title="Archive"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteNotifications([notification.id])}
                                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Load More */}
                  {hasMore && (
                    <button
                      onClick={() => fetchNotifications(false)}
                      disabled={loading}
                      className="w-full py-4 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading more...
                        </>
                      ) : (
                        'Load more notifications'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
