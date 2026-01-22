"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Book, HelpCircle, Search, FileText, ChevronRight, 
  Database, Workflow, Shield, Settings, Users, Zap, Code, Terminal,
  ExternalLink, MessageSquare, X
} from "lucide-react"
import { Button } from "@/components/ui/button"

type Article = {
  id: string
  title: string
  description: string
  category: string
  tags: string[]
  href: string
}

const articles: Article[] = [
  // Getting Started
  { id: "1", title: "How to create your first migration", description: "Learn the basics of creating database migrations with DataRoll.", category: "Getting Started", tags: ["migration", "create", "first", "beginner"], href: "/docs/migrations/create" },
  { id: "2", title: "Setting up database connections", description: "Configure and manage your database connections securely.", category: "Getting Started", tags: ["connection", "database", "setup", "configure"], href: "/docs/connections/setup" },
  { id: "3", title: "Installing the CLI", description: "Get started with the DataRoll command-line interface.", category: "Getting Started", tags: ["cli", "install", "terminal", "command"], href: "/docs/cli/install" },
  { id: "4", title: "Basic configuration", description: "Configure DataRoll for your project and team.", category: "Getting Started", tags: ["config", "configuration", "settings"], href: "/docs/config" },
  
  // Migrations
  { id: "5", title: "Creating migrations", description: "Write and organize your database migrations.", category: "Migrations", tags: ["migration", "create", "write", "sql"], href: "/docs/migrations/create" },
  { id: "6", title: "Running migrations", description: "Execute migrations against your databases.", category: "Migrations", tags: ["migration", "run", "execute", "apply"], href: "/docs/migrations/run" },
  { id: "7", title: "Rolling back changes", description: "Safely revert migrations when needed.", category: "Migrations", tags: ["rollback", "revert", "undo", "migration"], href: "/docs/migrations/rollback" },
  { id: "8", title: "Migration best practices", description: "Tips and patterns for reliable database migrations.", category: "Migrations", tags: ["best practices", "patterns", "tips"], href: "/docs/migrations/best-practices" },
  
  // Workflows
  { id: "9", title: "Creating approval workflows", description: "Set up multi-stage approval processes for migrations.", category: "Workflows", tags: ["workflow", "approval", "review"], href: "/docs/workflows/approvals" },
  { id: "10", title: "Automated CI/CD integration", description: "Integrate DataRoll with your CI/CD pipeline.", category: "Workflows", tags: ["cicd", "automation", "pipeline", "github"], href: "/docs/workflows/cicd" },
  { id: "11", title: "Scheduled migrations", description: "Schedule migrations to run at specific times.", category: "Workflows", tags: ["schedule", "cron", "timing"], href: "/docs/workflows/schedule" },
  
  // Teams
  { id: "12", title: "Managing team permissions", description: "Configure role-based access control for your team.", category: "Teams", tags: ["team", "permissions", "roles", "access"], href: "/docs/teams/permissions" },
  { id: "13", title: "Inviting team members", description: "Add collaborators to your DataRoll team.", category: "Teams", tags: ["team", "invite", "members", "add"], href: "/docs/teams/invite" },
  
  // Troubleshooting
  { id: "14", title: "Common error messages", description: "Solutions for frequently encountered errors.", category: "Troubleshooting", tags: ["error", "troubleshoot", "fix", "problem"], href: "/docs/troubleshooting/errors" },
  { id: "15", title: "Connection issues", description: "Resolve database connection problems.", category: "Troubleshooting", tags: ["connection", "error", "timeout", "network"], href: "/docs/troubleshooting/connections" },
  { id: "16", title: "Migration failures", description: "Debug and fix failed migrations.", category: "Troubleshooting", tags: ["migration", "fail", "error", "debug"], href: "/docs/troubleshooting/migrations" },
  { id: "17", title: "Performance optimization", description: "Improve migration and connection performance.", category: "Troubleshooting", tags: ["performance", "slow", "optimize", "speed"], href: "/docs/troubleshooting/performance" },
]

const categories = [
  { id: "getting-started", title: "Getting Started", icon: Book, color: "from-blue-500 to-cyan-500", description: "New to DataRoll? Start here." },
  { id: "migrations", title: "Migrations", icon: FileText, color: "from-purple-500 to-pink-500", description: "Create and manage migrations." },
  { id: "workflows", title: "Workflows", icon: Workflow, color: "from-amber-500 to-orange-500", description: "Automate your processes." },
  { id: "teams", title: "Teams", icon: Users, color: "from-green-500 to-emerald-500", description: "Collaborate with your team." },
  { id: "troubleshooting", title: "Troubleshooting", icon: HelpCircle, color: "from-red-500 to-rose-500", description: "Solve common problems." },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredArticles = useMemo(() => {
    let results = articles

    if (selectedCategory) {
      results = results.filter(a => a.category.toLowerCase().replace(/\s+/g, '-') === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      results = results.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.description.toLowerCase().includes(query) ||
        article.tags.some(tag => tag.toLowerCase().includes(query)) ||
        article.category.toLowerCase().includes(query)
      )
    }

    return results
  }, [searchQuery, selectedCategory])

  const popularArticles = articles.slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl px-6 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DR</span>
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-4">
            <HelpCircle className="w-4 h-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            How can we help you?
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Search our knowledge base or browse by category to find answers.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value) setSelectedCategory(null)
              }}
              placeholder="Search for help articles..."
              className="w-full pl-12 pr-12 py-4 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-shadow"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
              Found <span className="font-medium text-zinc-900 dark:text-zinc-100">{filteredArticles.length}</span> results for "{searchQuery}"
            </p>
          )}
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-12">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <Search className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No results found
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                  Try different keywords or browse categories below.
                </p>
                <Button onClick={() => setSearchQuery("")} variant="outline">
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredArticles.map(article => (
                  <Link
                    key={article.id}
                    href={article.href}
                    className="block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 block">
                          {article.category}
                        </span>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {article.description}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        {!searchQuery && (
          <>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
              {categories.map((category) => {
                const Icon = category.icon
                const isSelected = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(isSelected ? null : category.id)}
                    className={`text-left bg-white dark:bg-zinc-900 rounded-xl border p-5 transition-all duration-300 ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg'
                        : 'border-zinc-200 dark:border-zinc-800 hover:shadow-lg hover:-translate-y-1'
                    }`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-br ${category.color} rounded-lg flex items-center justify-center mb-3`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                      {category.title}
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {category.description}
                    </p>
                  </button>
                )
              })}
            </div>

            {/* Category Articles */}
            {selectedCategory && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {categories.find(c => c.id === selectedCategory)?.title} Articles
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                    <X className="w-4 h-4 mr-1" /> Clear filter
                  </Button>
                </div>
                <div className="space-y-3">
                  {filteredArticles.map(article => (
                    <Link
                      key={article.id}
                      href={article.href}
                      className="block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {article.description}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Popular Articles */}
            {!selectedCategory && (
              <section className="mb-12">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Popular Articles
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {popularArticles.map((article) => (
                    <Link
                      key={article.id}
                      href={article.href}
                      className="block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {article.category}
                          </span>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mt-1">
                            {article.title}
                          </h3>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {article.description}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Quick Resources */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">API Reference</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Complete API documentation with examples.
            </p>
            <Link href="/api-docs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View API Docs →
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">CLI Documentation</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Command-line tools and usage guides.
            </p>
            <Link href="/docs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View CLI Docs →
            </Link>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ExternalLink className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">GitHub</h3>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Source code, examples, and issue tracking.
            </p>
            <a href="https://github.com/dataroll" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
              View on GitHub →
            </a>
          </div>
        </section>

        {/* Contact Support */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-center">
          <MessageSquare className="w-12 h-12 text-white/80 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">
            Still need help?
          </h3>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            Can't find what you're looking for? Our support team is ready to assist you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Contact Support
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-all"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
