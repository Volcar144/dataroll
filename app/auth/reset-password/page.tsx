"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { Eye, EyeOff, Lock, CheckCircle2, XCircle, Loader2, Shield, KeyRound, AlertCircle, ArrowLeft, Check, X } from "lucide-react"

interface PasswordRequirement {
  label: string
  test: (password: string) => boolean
}

const passwordRequirements: PasswordRequirement[] = [
  { label: "At least 12 characters", test: (p) => p.length >= 12 },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One number", test: (p) => /[0-9]/.test(p) },
  { label: "One special character", test: (p) => /[!@#$%^&*(),.?\":{}|<>]/.test(p) },
]

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  const met = passwordRequirements.filter((req) => req.test(password)).length
  if (met <= 1) return { score: 20, label: "Very Weak", color: "bg-red-500" }
  if (met === 2) return { score: 40, label: "Weak", color: "bg-orange-500" }
  if (met === 3) return { score: 60, label: "Fair", color: "bg-yellow-500" }
  if (met === 4) return { score: 80, label: "Good", color: "bg-lime-500" }
  return { score: 100, label: "Strong", color: "bg-green-500" }
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [tokenError, setTokenError] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const errorParam = searchParams.get("error")

  useEffect(() => {
    if (errorParam === "INVALID_TOKEN") {
      setTokenError(true)
    }
  }, [errorParam])

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const allRequirementsMet = passwordRequirements.every((req) => req.test(password))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setError("Invalid or missing reset token")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (!allRequirementsMet) {
      setError("Please meet all password requirements")
      return
    }

    setLoading(true)
    setError("")

    try {
      const { error: resetError } = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (resetError) {
        setError(resetError.message || "Failed to reset password")
        return
      }

      setSuccess(true)
      
      // Redirect to sign in after 3 seconds
      setTimeout(() => {
        router.push("/auth/signin")
      }, 3000)
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Token Error State
  if (tokenError || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Invalid or Expired Link</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <div className="space-y-4">
            <Link
              href="/auth/forgot-password"
              className="block w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 transition-all text-center"
            >
              Request New Link
            </Link>
            <Link
              href="/auth/signin"
              className="block w-full py-3 px-4 rounded-xl font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Create New<br />Password
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              Choose a strong password to secure your account. Make it unique and memorable.
            </p>
          </div>
          
          <div className="space-y-6 mt-12">
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <span>Minimum 12 characters</span>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <span>Mix of letters, numbers & symbols</span>
            </div>
            <div className="flex items-center gap-4 text-white/80">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span>Checked against known breaches</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md">
          {/* Back Link */}
          <Link 
            href="/auth/signin" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>

          {!success ? (
            <>
              {/* Header */}
              <div className="mb-8">
                <div className="lg:hidden w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center mb-6">
                  <KeyRound className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Set New Password</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Create a strong, unique password for your account.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Alert */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={12}
                      placeholder="Create a strong password"
                      className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Password strength</span>
                        <span className={`font-medium ${
                          passwordStrength.score >= 80 ? "text-green-600" : 
                          passwordStrength.score >= 60 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={12}
                      placeholder="Confirm your password"
                      className={`w-full pl-12 pr-12 py-3.5 rounded-xl border ${
                        confirmPassword && !passwordsMatch 
                          ? "border-red-300 dark:border-red-700" 
                          : confirmPassword && passwordsMatch
                          ? "border-green-300 dark:border-green-700"
                          : "border-gray-200 dark:border-gray-700"
                      } bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {confirmPassword && (
                    <p className={`text-sm mt-2 flex items-center gap-1 ${passwordsMatch ? "text-green-600" : "text-red-600"}`}>
                      {passwordsMatch ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>

                {/* Password Requirements */}
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Password Requirements</p>
                  <div className="space-y-2">
                    {passwordRequirements.map((req, index) => {
                      const met = req.test(password)
                      return (
                        <div key={index} className="flex items-center gap-2">
                          {met ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <X className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-sm ${met ? "text-green-600 dark:text-green-400" : "text-gray-500"}`}>
                            {req.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !allRequirementsMet || !passwordsMatch}
                  className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <KeyRound className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Success State */
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Password Reset!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-8">
                Redirecting to sign in page in 3 seconds...
              </p>
              <Link
                href="/auth/signin"
                className="block w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all text-center"
              >
                Sign In Now
              </Link>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-12">
            Need help?{" "}
            <Link href="/help" className="text-emerald-600 dark:text-emerald-400 hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
