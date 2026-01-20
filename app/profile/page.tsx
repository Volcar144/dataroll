"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { AuthService } from "@/lib/auth-service"
import posthog from "posthog-js"

export default function Profile() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [password, setPassword] = useState("")
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [passkeyName, setPasskeyName] = useState("")
  const [showPasskeyInput, setShowPasskeyInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

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

      // Track 2FA enabled event
      posthog.capture('two_factor_enabled', {
        user_email: session?.user?.email,
      })
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

      // Track 2FA disabled event
      posthog.capture('two_factor_disabled', {
        user_email: session?.user?.email,
      })
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
      // Reload passkeys list
      loadPasskeys()

      // Track passkey added event
      posthog.capture('passkey_added', {
        user_email: session?.user?.email,
        passkey_name: passkeyName.trim(),
      })
    } catch (_err) {
      setError("Failed to add passkey")
      posthog.captureException(_err)
    } finally {
      setLoading(false)
    }
  }

  const loadPasskeys = async () => {
    try {
      // This would typically fetch passkeys from the API
      // For now, we'll just show a placeholder
    } catch (err) {
      console.error("Failed to load passkeys", err)
    }
  }

  if (isPending) {
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
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Profile Settings
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">
                Manage your account security settings
              </p>
            </div>
            <button
              onClick={() => {
                posthog.capture('user_signed_out')
                posthog.reset()
                signOut()
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Two-Factor Authentication
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Add an extra layer of security to your account with TOTP (Time-based One-Time Password).
          </p>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Status: {twoFactorEnabled ? "Enabled" : "Disabled"}
              </p>
            </div>

            {showPasswordInput && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Confirm Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Enter your password"
                />
              </div>
            )}

            <button
              onClick={twoFactorEnabled ? handleDisable2FA : handleEnable2FA}
              disabled={loading}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                twoFactorEnabled
                  ? "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 focus:ring-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              } disabled:opacity-50`}
            >
              {loading ? "Processing..." : twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
            </button>
          </div>
        </div>

        {/* Passkeys */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Passkeys (WebAuthn)
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            Use biometric authentication or hardware security keys for passwordless sign-in.
          </p>

          <div className="space-y-4">
            {showPasskeyInput && (
              <div>
                <label htmlFor="passkeyName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Passkey Name
                </label>
                <input
                  id="passkeyName"
                  type="text"
                  value={passkeyName}
                  onChange={(e) => setPasskeyName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="Enter a name for your passkey (e.g., 'My Laptop')"
                  autoFocus
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Choose a descriptive name to identify this passkey later.
                </p>
              </div>
            )}

            <button
              onClick={handleAddPasskey}
              disabled={loading}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Adding Passkey..." : showPasskeyInput ? "Register Passkey" : "Add New Passkey"}
            </button>

            {showPasskeyInput && (
              <button
                onClick={() => {
                  setShowPasskeyInput(false)
                  setPasskeyName("")
                }}
                className="w-full px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Account Information
          </h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Name
              </label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {session.user.name || "Not set"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email
              </label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {session.user.email}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Verified
              </label>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {session.user.emailVerified ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}
      </div>
    </div>
  )
}