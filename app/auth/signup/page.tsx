"use client"

import { useState, useEffect, Suspense, useMemo } from "react"
import { AuthService } from "@/lib/auth-service"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import posthog from "posthog-js"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Github, Chrome, MessageCircle, Shield, AlertCircle, Loader2, Check, X } from "lucide-react"

function SignUpForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check for error in URL parameters
  useEffect(() => {
    const urlError = searchParams.get('error')
    if (urlError) {
      setError(decodeURIComponent(urlError))
    }
  }, [searchParams])

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' }
    
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^a-zA-Z0-9]/.test(password)) score++

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500']

    return {
      score,
      label: labels[Math.min(score, 4)] || 'Very Weak',
      color: colors[Math.min(score, 4)] || 'bg-red-500'
    }
  }, [password])

  // Password requirements
  const requirements = useMemo(() => [
    { met: password.length >= 12, text: 'At least 12 characters' },
    { met: /[a-z]/.test(password) && /[A-Z]/.test(password), text: 'Upper & lowercase letters' },
    { met: /[0-9]/.test(password), text: 'At least one number' },
    { met: /[^a-zA-Z0-9]/.test(password), text: 'At least one special character' },
  ], [password])

  const validateForm = () => {
    const errors: Record<string, string> = {}
    
    if (!name.trim()) errors.name = 'Name is required'
    if (!email.trim()) errors.email = 'Email is required'
    if (password.length < 12) errors.password = 'Password must be at least 12 characters'
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (!acceptTerms) errors.terms = 'You must accept the terms and conditions'
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!validateForm()) return

    setLoading(true)

    try {
      const result = await AuthService.signUpWithEmail({
        email,
        password,
        name,
      })

      if (!result.success) {
        setError(result.error || "Sign up failed")
        posthog.capture('user_signup_failed', { error: result.error })
        return
      }

      posthog.identify(email, { email, name })
      posthog.capture('user_signed_up', { email, name })

      router.push("/auth/signin?message=Account created successfully. Please sign in.")
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const handleSocialSignUp = async (provider: "google" | "github" | "discord") => {
    setSocialLoading(provider)
    setError("")

    try {
      const result = await AuthService.signInWithSocial(provider)

      if (!result.success) {
        setError(result.error || "Social sign up failed")
        posthog.capture('user_signup_failed', { method: 'social', provider, error: result.error })
        return
      }

      posthog.capture('user_signed_up_social', { method: 'social', provider })
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
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-12 flex-col justify-between relative overflow-hidden">
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
            Start managing your<br />database migrations today
          </h1>
          <p className="text-emerald-100 text-lg max-w-md">
            Join thousands of developers who trust DataRoll for their database migration workflows.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>Free tier with generous limits</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <span>Set up in under 5 minutes</span>
            </div>
          </div>
        </div>
        
        <p className="text-emerald-200 text-sm relative z-10">
          © {new Date().getFullYear()} DataRoll. All rights reserved.
        </p>
      </div>

      {/* Right side - Sign Up Form */}
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-6 py-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-cyan-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">DR</span>
              </div>
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
            </Link>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Create your account
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              Get started with your free account today
            </p>
          </div>

          {/* Social signup buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSocialSignUp("google")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign up with Google"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Chrome className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">Google</span>
            </button>
            <button
              onClick={() => handleSocialSignUp("github")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign up with GitHub"
            >
              {socialLoading === 'github' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">GitHub</span>
            </button>
            <button
              onClick={() => handleSocialSignUp("discord")}
              disabled={loading || socialLoading !== null}
              className="flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 rounded-xl text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Sign up with Discord"
            >
              {socialLoading === 'discord' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <MessageCircle className="w-5 h-5" />
              )}
              <span className="sr-only sm:not-sr-only sm:font-medium">Discord</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
                Or continue with email
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl animate-in slide-in-from-top-2" role="alert">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                <input
                  id="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.name ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                  placeholder="John Doe"
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.name}</p>
              )}
            </div>

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
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.email ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.password ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                  }`}
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
              
              {/* Password strength indicator */}
              {password && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${passwordStrength.color} transition-all duration-300`}
                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 min-w-[70px]">
                      {passwordStrength.label}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1">
                    {requirements.map((req, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs">
                        {req.met ? (
                          <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-zinc-400" />
                        )}
                        <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-zinc-500 dark:text-zinc-400'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" aria-hidden="true" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-12 py-2.5 border rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow ${
                    fieldErrors.confirmPassword ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className={`h-4 w-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 ${
                  fieldErrors.terms ? 'border-red-500' : 'border-zinc-300 dark:border-zinc-600'
                }`}
              />
              <label htmlFor="accept-terms" className="ml-2 block text-sm text-zinc-700 dark:text-zinc-300">
                I agree to the{" "}
                <Link href="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">
                  Privacy Policy
                </Link>
              </label>
            </div>
            {fieldErrors.terms && (
              <p className="text-xs text-red-600 dark:text-red-400">{fieldErrors.terms}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 py-2.5 px-4 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignUp() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <span className="text-zinc-600 dark:text-zinc-400">Loading...</span>
        </div>
      </div>
    }>
      <SignUpForm />
    </Suspense>
  )
}
