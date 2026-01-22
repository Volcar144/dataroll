"use client"

import { useState, useEffect, Suspense } from "react"
import { AuthService } from "@/lib/auth-service"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import posthog from "posthog-js"
import { Eye, EyeOff, Mail, Lock, Key, ArrowRight, Github, Chrome, MessageCircle, Fingerprint, Shield, AlertCircle, Loader2 } from "lucide-react"

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error in URL parameters
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await AuthService.signInWithEmail({
        email,
        password,
        twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
      })

      if (!result.success) {
        if (result.requiresTwoFactor) {
          setShowTwoFactor(true)
          setLoading(false)
          return
        }
        setError(result.error || "Sign in failed")
        posthog.capture('user_signin_failed', {
          method: 'email',
          error: result.error || "Sign in failed",
        })
        return
      }

      posthog.identify(email, { email })
      posthog.capture('user_signed_in', { method: 'email', used_2fa: showTwoFactor })
      router.push("/dashboard")
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    setLoading(true)
    setError("")

    try {
      const result = await AuthService.signInWithPasskey()

      if (!result.success) {
        setError(result.error || "Passkey authentication failed")
        posthog.capture('user_signin_failed', { method: 'passkey', error: result.error })
        return
      }

      posthog.capture('user_signed_in_passkey', { method: 'passkey' })
      router.push("/dashboard")
    } catch (err) {
      setError("An unexpected error occurred")
      posthog.captureException(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignIn = async (provider: "google" | "github" | "discord") => {
    setSocialLoading(provider)
    setError("")

    try {
      const result = await AuthService.signInWithSocial(provider)

      if (!result.success) {
        setError(result.error || "Social sign in failed")
        posthog.capture('user_signin_failed', { method: 'social', provider, error: result.error })
        return
      }

      posthog.capture('user_signed_in_social', { method: 'social', provider })
      router.push("/dashboard")
    } catch (err) {
      setError("An unexpected error occurred")
      posthog.captureException(err)
    } finally {
      setSocialLoading(null)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">DR</span>
            </div>
            <span className="text-2xl font-bold text-white">DataRoll</span>
          </Link>
        </div>
        
        <div className="space-y-8 relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Manage your database<br />migrations with confidence
          </h1>
          <p className="text-blue-100 text-lg max-w-md">
            Automated migration tracking, team collaboration, and secure credential management—all in one place.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-4 h-4" />
              </div>
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <span>Encrypted credential storage</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Fingerprint className="w-4 h-4" />
              </div>
              <span>Passkey & 2FA support</span>
            </div>
          </div>
        </div>
        
        <p className="text-blue-200 text-sm relative z-10">
          © {new Date().getFullYear()} DataRoll. All rights reserved.
        </p>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">DR</span>
              </div>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
            </Link>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Welcome back
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Sign in to your account to continue
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Password
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {showTwoFactor && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <label htmlFor="twoFactorCode" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Two-Factor Authentication Code
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                  <input
                    id="twoFactorCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full pl-10 pr-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow tracking-widest text-center font-mono text-lg"
                  />
                </div>
                <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}

            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300">
                Remember me for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2.5 px-4 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {showTwoFactor ? "Verifying..." : "Signing in..."}
                </>
              ) : (
                <>
                  {showTwoFactor ? "Verify & Sign In" : "Sign In"}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
                Or continue with
              </span>
            </div>
          </div>

          <button
            onClick={handlePasskeySignIn}
            disabled={loading || socialLoading !== null}
            className="w-full flex items-center justify-center gap-3 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Fingerprint className="w-5 h-5" />
            <span className="font-medium">Sign in with Passkey</span>
          </button>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialSignIn("google")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign in with Google"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Chrome className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">Google</span>
            </button>
            <button
              onClick={() => handleSocialSignIn("github")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign in with GitHub"
            >
              {socialLoading === 'github' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">GitHub</span>
            </button>
            <button
              onClick={() => handleSocialSignIn("discord")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign in with Discord"
            >
              {socialLoading === 'discord' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">Discord</span>
            </button>
          </div>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignIn() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
        </div>
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
