"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth-service"
import Link from "next/link"
import posthog from "posthog-js"
import { 
  User, Mail, Shield, Key, Fingerprint, LogOut, Settings, Bell, 
  Check, X, AlertCircle, Loader2, Eye, EyeOff, Trash2, Plus,
  ChevronRight, Globe, Clock, Smartphone, MonitorSmartphone, Lock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

interface Integration {
  id: string
  type: string
  name: string
  isActive: boolean
  isDefault: boolean
  createdAt: string
}

export default function Profile() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'integrations' | 'preferences'>('profile')
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [password, setPassword] = useState("")
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passkeyName, setPasskeyName] = useState("")
  const [showPasskeyInput, setShowPasskeyInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(true)

  // Profile editing
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      setNewName(session.user.name || "")
      fetchIntegrations()
    }
  }, [session])

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/integrations')
      const data = await res.json()
      if (data.success) {
        setIntegrations(data.data || [])
      }
    } catch (err) {
      console.error('Failed to fetch integrations', err)
    } finally {
      setLoadingIntegrations(false)
    }
  }

  const handleEnable2FA = async () => {
    if (!password) {
      setShowPasswordInput(true)
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await AuthService.enableTwoFactor(password)

      if (!result.success) {
        setError(result.error || "Failed to enable 2FA")
        return
      }

      setSuccess("Two-factor authentication enabled successfully!")
      setTwoFactorEnabled(true)
      setPassword("")
      setShowPasswordInput(false)
      posthog.capture('two_factor_enabled', { user_email: session?.user?.email })
    } catch (_err) {
      setError("Failed to enable 2FA")
      posthog.captureException(_err)
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    if (!password) {
      setShowPasswordInput(true)
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await AuthService.disableTwoFactor(password)

      if (!result.success) {
        setError(result.error || "Failed to disable 2FA")
        return
      }

      setSuccess("Two-factor authentication disabled successfully!")
      setTwoFactorEnabled(false)
      setPassword("")
      setShowPasswordInput(false)
      posthog.capture('two_factor_disabled', { user_email: session?.user?.email })
    } catch (_err) {
      setError("Failed to disable 2FA")
      posthog.captureException(_err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPasskey = async () => {
    if (!passkeyName.trim()) {
      setShowPasskeyInput(true)
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const result = await AuthService.addPasskey(passkeyName.trim())

      if (!result.success) {
        setError(result.error || "Failed to add passkey")
        return
      }

      setSuccess("Passkey added successfully!")
      setPasskeyName("")
      setShowPasskeyInput(false)
      posthog.capture('passkey_added', { user_email: session?.user?.email, passkey_name: passkeyName.trim() })
    } catch (_err) {
      setError("Failed to add passkey")
      posthog.captureException(_err)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = () => {
    posthog.capture('user_signed_out')
    posthog.reset()
    signOut()
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <div className="grid md:grid-cols-4 gap-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="md:col-span-3 space-y-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ] as const

  const integrationTypeColors: Record<string, string> = {
    EMAIL: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    SLACK: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    WEBHOOK: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    DISCORD: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    TEAMS: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
    PAGERDUTY: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {session.user.name?.charAt(0).toUpperCase() || session.user.email?.charAt(0).toUpperCase()}
            </div>
            
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">
                {session.user.name || 'Anonymous User'}
              </h1>
              <p className="text-white/80 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {session.user.email}
              </p>
              <div className="flex items-center gap-3 mt-3">
                {session.user.emailVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-100 text-xs font-medium">
                    <Check className="w-3 h-3" /> Email verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-100 text-xs font-medium">
                    <AlertCircle className="w-3 h-3" /> Email not verified
                  </span>
                )}
                {twoFactorEnabled && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-100 text-xs font-medium">
                    <Shield className="w-3 h-3" /> 2FA enabled
                  </span>
                )}
              </div>
            </div>

            <Button 
              onClick={handleSignOut}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2" role="alert">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={() => setError("")} className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl animate-in slide-in-from-top-2" role="alert">
            <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess("")} className="ml-auto text-green-600 dark:text-green-400 hover:text-green-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Content Area */}
          <div className="md:col-span-3 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Personal Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Full Name
                      </label>
                      {editingName ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <Button onClick={() => setEditingName(false)} variant="outline" size="sm">
                            Cancel
                          </Button>
                          <Button size="sm">Save</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <p className="text-zinc-900 dark:text-zinc-100">
                            {session.user.name || 'Not set'}
                          </p>
                          <Button onClick={() => setEditingName(true)} variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                        Email Address
                      </label>
                      <div className="flex items-center justify-between">
                        <p className="text-zinc-900 dark:text-zinc-100">{session.user.email}</p>
                        <span className="text-xs text-zinc-500">Cannot be changed</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Account Status
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Member Since</p>
                      <p className="text-zinc-900 dark:text-zinc-100 font-medium">January 2026</p>
                    </div>
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Account Type</p>
                      <p className="text-zinc-900 dark:text-zinc-100 font-medium">Free Plan</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Two-Factor Authentication
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Add an extra layer of security with TOTP authentication.
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      twoFactorEnabled 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>

                  {showPasswordInput && (
                    <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Confirm your password to continue
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-12 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
                    disabled={loading}
                    variant={twoFactorEnabled ? "outline" : "default"}
                    className={twoFactorEnabled ? 'border-red-300 text-red-600 hover:bg-red-50' : ''}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4 mr-2" />
                    )}
                    {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </Button>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Passkeys
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Use biometric authentication or hardware security keys for passwordless sign-in.
                      </p>
                    </div>
                  </div>

                  {showPasskeyInput && (
                    <div className="mb-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Name your passkey
                      </label>
                      <input
                        type="text"
                        value={passkeyName}
                        onChange={(e) => setPasskeyName(e.target.value)}
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        placeholder="e.g., MacBook Pro, iPhone 15"
                        autoFocus
                      />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                        Choose a name to help identify this passkey later.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddPasskey}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      {showPasskeyInput ? 'Register Passkey' : 'Add Passkey'}
                    </Button>
                    {showPasskeyInput && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowPasskeyInput(false)
                          setPasskeyName("")
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Active Sessions
                  </h2>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <MonitorSmartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Current Session</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">This device • Just now</p>
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-medium">
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Your Integrations
                      </h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        Manage your notification providers and external connections.
                      </p>
                    </div>
                    <Link href="/dashboard/workflows">
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Integration
                      </Button>
                    </Link>
                  </div>

                  {loadingIntegrations ? (
                    <div className="space-y-3">
                      {[1, 2].map(i => (
                        <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      ))}
                    </div>
                  ) : integrations.length === 0 ? (
                    <div className="text-center py-8">
                      <Key className="w-12 h-12 text-zinc-400 mx-auto mb-3" />
                      <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                        No integrations configured yet.
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-500">
                        Add integrations to receive notifications from your workflows.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {integrations.map(integration => (
                        <div 
                          key={integration.id}
                          className="flex items-center justify-between p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              integrationTypeColors[integration.type] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                            }`}>
                              {integration.type}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {integration.name}
                                {integration.isDefault && (
                                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(default)</span>
                                )}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Added {new Date(integration.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              integration.isActive ? 'bg-green-500' : 'bg-zinc-400'
                            }`} />
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Notification Preferences
                  </h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Email notifications for workflow failures', enabled: true },
                      { label: 'Email notifications for approval requests', enabled: true },
                      { label: 'Weekly summary emails', enabled: false },
                      { label: 'Marketing emails', enabled: false },
                    ].map((pref, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">{pref.label}</span>
                        <button
                          className={`relative w-11 h-6 rounded-full transition-colors ${
                            pref.enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-600'
                          }`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              pref.enabled ? 'left-6' : 'left-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Regional Settings
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        Timezone
                      </label>
                      <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                        <option>UTC</option>
                        <option>America/New_York</option>
                        <option>America/Los_Angeles</option>
                        <option>Europe/London</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                        Date Format
                      </label>
                      <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                        <option>MM/DD/YYYY</option>
                        <option>DD/MM/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
                  <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                    Danger Zone
                  </h2>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                  <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
