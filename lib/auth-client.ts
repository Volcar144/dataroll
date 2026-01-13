// Client-side auth utilities for React components

export interface AuthUser {
  id: string
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string | null
  teamId?: string | null
}

export interface Session {
  user: AuthUser
  expires: string
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check for better-auth session cookie
  return document.cookie.includes('better-auth.session-token')
}

// Get current user from session
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return null
  
  try {
    const response = await fetch('/api/auth/session')
    if (!response.ok) return null
    
    const data = await response.json()
    return data.user || null
  } catch (error) {
    console.error('Failed to get current user:', error)
    return null
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Sign in failed' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// Sign up with email and password
export async function signUp(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Sign up failed' }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// Sign out
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/signout', {
      method: 'POST',
    })

    if (!response.ok) {
      const error = await response.json()
      return { success: false, error: error.message || 'Sign out failed' }
    }

    // Clear any client-side storage
    localStorage.clear()
    sessionStorage.clear()
    
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

// Check if user has required role
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user || !user.role) return false
  
  const roleHierarchy = {
    OWNER: 3,
    ADMIN: 2,
    MEMBER: 1,
  }
  
  const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0
  
  return userRoleLevel >= requiredRoleLevel
}

// Check if user belongs to specific team
export function isTeamMember(user: AuthUser | null, teamId: string): boolean {
  return !!(user && user.teamId === teamId)
}

// Format user display name
export function formatUserName(user: AuthUser): string {
  if (user.name) return user.name
  if (user.email != null) {
    return String(user.email).split('@')[0]
  }
  return 'User'
}