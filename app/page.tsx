"use client"

import { useSession } from "@/lib/auth-service"
import { signOut } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { useShortcut } from "@/lib/keyboard-shortcuts"
import { 
  Database, 
  GitBranch, 
  Shield, 
  Activity, 
  Users, 
  Workflow, 
  FileText, 
  BarChart3,
  Settings,
  Bell,
  ArrowRight,
  CheckCircle2,
  Zap,
  Lock,
  Globe
} from "lucide-react"

function LandingPage() {
  const router = useRouter();

  // Keyboard shortcuts
  useShortcut('s', () => router.push('/auth/signin'), {
    description: 'Sign In',
    category: 'Navigation'
  });

  useShortcut('g', () => router.push('/auth/signup'), {
    description: 'Get Started (Sign Up)',
    category: 'Navigation'
  });

  useShortcut('d', () => router.push('/dashboard'), {
    description: 'Go to Dashboard',
    category: 'Navigation'
  });

  useShortcut('?', () => {
    // This will be handled by the KeyboardShortcutsHelp component
  }, {
    description: 'Show keyboard shortcuts',
    category: 'Help'
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DR</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">DataRoll</span>
          </div>
          <div className="flex items-center space-x-4">
            <KeyboardShortcutsHelp />
            <ThemeToggle />
            <Link href="/auth/signin" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Database Management
            <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            DataRoll provides powerful database migration, monitoring, and rollback capabilities
            with an intuitive CLI and SDK. Deploy with confidence, monitor in real-time, and
            recover instantly when things go wrong.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-zinc-100 mb-4">
              Everything you need for database operations
            </h2>
            <p className="text-xl text-gray-600 dark:text-zinc-400">
              From development to production, DataRoll has you covered
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Lightning Fast Migrations</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                Execute database migrations instantly with our optimized engine.
                Support for PostgreSQL, MySQL, and SQLite.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-green-300 dark:hover:border-green-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Activity className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Real-time Monitoring</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                Monitor database health, performance, and errors in real-time.
                Get alerts before issues become problems.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Enterprise Security</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                RBAC, audit logs, and encrypted credentials. SOC 2 compliant
                with enterprise-grade security features.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <GitBranch className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Instant Rollbacks</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                Made a mistake? Roll back to any previous state instantly.
                Zero-downtime migrations included.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Team Collaboration</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                Work together with role-based access control. Review and
                approve migrations before they go live.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group text-center p-6 rounded-xl border border-gray-200 dark:border-zinc-800 hover:shadow-lg hover:border-yellow-300 dark:hover:border-yellow-700 transition-all bg-white dark:bg-zinc-900">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Workflow className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-zinc-100 mb-2">Automated Workflows</h3>
              <p className="text-gray-600 dark:text-zinc-400">
                Create automated workflows for CI/CD integration. Run
                migrations on deployment automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to simplify your database operations?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of developers who trust DataRoll for their database needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-all shadow-lg"
            >
              Start Your Free Trial
            </Link>
            <Link
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DR</span>
                </div>
                <span className="text-xl font-bold">DataRoll</span>
              </div>
              <p className="text-gray-400">
                Making database operations simple, reliable, and secure.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/docs" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><Link href="/api-docs" className="hover:text-white transition-colors">API</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/report-issue" className="hover:text-white transition-colors">Report Issue</Link></li>
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2026 DataRoll. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Dashboard() {
  const { data: session } = useSession()
  const router = useRouter()

  // Keyboard shortcuts
  useShortcut('c', () => router.push('/dashboard/connections'), {
    description: 'Go to Connections',
    category: 'Navigation'
  });

  useShortcut('m', () => router.push('/dashboard/migrations'), {
    description: 'Go to Migrations',
    category: 'Navigation'
  });

  useShortcut('w', () => router.push('/dashboard/workflows'), {
    description: 'Go to Workflows',
    category: 'Navigation'
  });

  useShortcut('t', () => router.push('/dashboard/teams'), {
    description: 'Go to Teams',
    category: 'Navigation'
  });

  const quickLinks = [
    {
      title: "Connections",
      description: "Manage database connections",
      icon: Database,
      href: "/dashboard/connections",
      color: "from-blue-500 to-cyan-500",
      shortcut: "C"
    },
    {
      title: "Migrations",
      description: "Create and run migrations",
      icon: GitBranch,
      href: "/dashboard/migrations",
      color: "from-purple-500 to-pink-500",
      shortcut: "M"
    },
    {
      title: "Workflows",
      description: "Automate your processes",
      icon: Workflow,
      href: "/dashboard/workflows",
      color: "from-green-500 to-emerald-500",
      shortcut: "W"
    },
    {
      title: "Monitoring",
      description: "Track database health",
      icon: Activity,
      href: "/dashboard/monitoring",
      color: "from-orange-500 to-red-500",
      shortcut: "N"
    },
    {
      title: "Teams",
      description: "Manage team access",
      icon: Users,
      href: "/dashboard/teams",
      color: "from-indigo-500 to-purple-500",
      shortcut: "T"
    },
    {
      title: "Audit Logs",
      description: "View activity history",
      icon: FileText,
      href: "/dashboard/audit",
      color: "from-yellow-500 to-orange-500",
      shortcut: "A"
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="flex items-center space-x-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <span className="text-white font-bold text-sm">DR</span>
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
            </Link>
            <div className="hidden md:flex items-center space-x-1">
              <Link 
                href="/dashboard" 
                className="px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                href="/dashboard/connections" 
                className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Connections
              </Link>
              <Link 
                href="/dashboard/migrations" 
                className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Migrations
              </Link>
              <Link 
                href="/dashboard/workflows" 
                className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Workflows
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <KeyboardShortcutsHelp />
            <ThemeToggle />
            <Link 
              href="/profile" 
              className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              {session?.user?.name || session?.user?.email || "Profile"}
            </Link>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Here's what you can do with DataRoll
          </p>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${link.color} bg-opacity-10`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    {link.shortcut}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {link.description}
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  Open <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
                <div className={`absolute inset-0 bg-gradient-to-br ${link.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
              </Link>
            )
          })}
        </div>

        {/* Additional Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Link 
                href="/dashboard/connections?new=true" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add Connection</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
              <Link 
                href="/dashboard/migrations?new=true" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Create Migration</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
              <Link 
                href="/dashboard/workflows?new=true" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Workflow</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl border border-green-200 dark:border-green-900 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Resources</h3>
            </div>
            <div className="space-y-3">
              <a 
                href="/test-error-tracking" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Test Error Tracking</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
              </a>
              <Link 
                href="/report-issue" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Report an Issue</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
              </Link>
              <Link 
                href="/profile" 
                className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg hover:shadow-md transition-all group"
              >
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Account Settings</span>
                <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/dashboard')
    }
  }, [session, router])

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto"></div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (session) {
    return <Dashboard />
  }

  return <LandingPage />
}
