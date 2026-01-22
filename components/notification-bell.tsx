"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Bell, Check, CheckCheck, Archive, Trash2, X, ExternalLink, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link?: string
  read: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

interface NotificationResponse {
  notifications: Notification[]
  totalCount: number
  unreadCount: number
  hasMore: boolean
}

// Notification type icons and colors
const notificationTypeConfig: Record<string, { color: string; bgColor: string }> = {
  approval_request: { color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  approval_response: { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  workflow_success: { color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  workflow_failure: { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  team_invite: { color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  migration_complete: { color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  migration_failed: { color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  system: { color: "text-violet-600", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      const offset = reset ? 0 : notifications.length
      const response = await fetch(`/api/notifications?limit=10&offset=${offset}`)
      
      if (!response.ok) throw new Error('Failed to fetch notifications')
      
      const data: NotificationResponse = await response.json()
      
      if (reset) {
        setNotifications(data.notifications)
      } else {
        setNotifications(prev => [...prev, ...data.notifications])
      }
      setUnreadCount(data.unreadCount)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }, [notifications.length])

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications(true)
    
    // Poll for new notifications every 30 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchNotifications(true)
    }, 30000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      setUnreadCount(prev => Math.max(0, prev - ids.length))
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

  const archiveNotification = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], action: 'archive' }),
      })
      
      const notification = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Error archiving notification:', error)
    }
  }

  const getTypeConfig = (type: string) => {
    return notificationTypeConfig[type] || notificationTypeConfig.system
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[calc(100vh-100px)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">No notifications</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => {
                  const typeConfig = getTypeConfig(notification.type)
                  return (
                    <div
                      key={notification.id}
                      className={`group relative px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        !notification.read ? 'bg-violet-50/50 dark:bg-violet-900/10' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        {/* Type Indicator */}
                        <div className={`w-2 h-2 mt-2 rounded-full ${typeConfig.bgColor.replace('bg-', 'bg-').replace('-100', '-500').replace('-900/30', '-500')}`} />
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </span>
                            {notification.link && (
                              <a
                                href={notification.link}
                                className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                                onClick={() => {
                                  if (!notification.read) markAsRead([notification.id])
                                }}
                              >
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead([notification.id])}
                              className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => archiveNotification(notification.id)}
                            className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
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
                    className="w-full py-3 text-sm text-violet-600 dark:text-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <a
                href="/dashboard/notifications"
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
