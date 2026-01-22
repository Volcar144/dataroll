"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  ArrowLeft, Book, Code, FileText, GitBranch, Terminal, Copy, Check, 
  ChevronRight, Search, Menu, X, ExternalLink, Zap, AlertCircle, Info, Lightbulb
} from "lucide-react"
import { Button } from "@/components/ui/button"

function CodeBlock({ children, language = "bash" }: { children: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-xs font-medium opacity-0 group-hover:opacity-100 focus:opacity-100"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-green-400" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 rounded-t-lg border-b border-zinc-700">
        <span className="text-xs font-medium text-zinc-400">{language}</span>
      </div>
      <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-b-lg overflow-x-auto">
        <code className="text-sm leading-relaxed">{children}</code>
      </pre>
    </div>
  )
}

function Callout({ 
  type = "info", 
  title, 
  children 
}: { 
  type?: "info" | "warning" | "tip" | "danger"
  title?: string
  children: React.ReactNode 
}) {
  const styles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: <Info className="w-5 h-5 text-blue-500" />,
      title: "text-blue-900 dark:text-blue-100",
      text: "text-blue-800 dark:text-blue-200",
    },
    warning: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
      title: "text-amber-900 dark:text-amber-100",
      text: "text-amber-800 dark:text-amber-200",
    },
    tip: {
      bg: "bg-green-50 dark:bg-green-950/30",
      border: "border-green-200 dark:border-green-800",
      icon: <Lightbulb className="w-5 h-5 text-green-500" />,
      title: "text-green-900 dark:text-green-100",
      text: "text-green-800 dark:text-green-200",
    },
    danger: {
      bg: "bg-red-50 dark:bg-red-950/30",
      border: "border-red-200 dark:border-red-800",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      title: "text-red-900 dark:text-red-100",
      text: "text-red-800 dark:text-red-200",
    },
  }

  const style = styles[type]

  return (
    <div className={`${style.bg} ${style.border} border rounded-xl p-4 my-6`}>
      <div className="flex gap-3">
        <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
        <div>
          {title && <p className={`font-semibold ${style.title} mb-1`}>{title}</p>}
          <div className={`text-sm ${style.text}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export default function DocsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const sections = [
    {
      title: "Getting Started",
      icon: Book,
      items: [
        { name: "Quick Start", href: "#quick-start" },
        { name: "Installation", href: "#installation" },
        { name: "Configuration", href: "#configuration" },
        { name: "Your First Migration", href: "#first-migration" },
      ],
    },
    {
      title: "CLI Reference",
      icon: Terminal,
      items: [
        { name: "CLI Commands", href: "#cli-commands" },
        { name: "Authentication", href: "#authentication" },
        { name: "Environment Variables", href: "#env-vars" },
      ],
    },
    {
      title: "API Reference",
      icon: Code,
      items: [
        { name: "REST API", href: "#rest-api" },
        { name: "SDK", href: "#sdk" },
        { name: "Webhooks", href: "#webhooks" },
      ],
    },
    {
      title: "Migrations",
      icon: GitBranch,
      items: [
        { name: "Creating Migrations", href: "#create-migrations" },
        { name: "Running Migrations", href: "#run-migrations" },
        { name: "Rollback", href: "#rollback" },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">DR</span>
              </div>
              <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Documentation</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search docs..."
                className="w-64 pl-9 pr-4 py-2 text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 bg-zinc-200 dark:bg-zinc-800 rounded">⌘K</kbd>
            </div>
            
            <Link 
              href="/" 
              className="hidden sm:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Link>
            
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className={`
          fixed md:sticky top-[57px] left-0 z-40 w-72 h-[calc(100vh-57px)] bg-white dark:bg-zinc-950 
          border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto
          transform transition-transform md:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-4 space-y-6">
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <div key={section.title}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-zinc-400" />
                    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {section.items.map((item) => (
                      <li key={item.name}>
                        <a
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className="block py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-2">Resources</h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/api-docs" className="flex items-center gap-2 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400">
                    <Code className="w-4 h-4" />
                    API Reference
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/dataroll" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400">
                    <GitBranch className="w-4 h-4" />
                    GitHub
                    <ExternalLink className="w-3 h-3 ml-auto" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Content */}
        <main className="flex-1 min-w-0 px-6 py-10 md:px-10">
          <div className="max-w-3xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-6">
              <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-zinc-900 dark:text-zinc-100">Documentation</span>
            </nav>

            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              DataRoll Documentation
            </h1>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-8">
              Learn how to manage your database migrations with confidence.
            </p>

            {/* Quick Start Cards */}
            <div className="grid sm:grid-cols-2 gap-4 mb-12">
              <Link 
                href="#quick-start"
                className="group p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    Quick Start
                  </h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Get up and running in under 5 minutes.
                </p>
              </Link>
              <Link 
                href="/api-docs"
                className="group p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    API Reference
                  </h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Explore the REST API and SDK.
                </p>
              </Link>
            </div>

            {/* Quick Start Section */}
            <section id="quick-start" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Quick Start</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Get started with DataRoll in just a few steps.
              </p>

              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                1. Install the CLI
              </h3>
              <CodeBlock language="bash">npm install -g @dataroll/cli</CodeBlock>

              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3 mt-6">
                2. Authenticate
              </h3>
              <CodeBlock language="bash">dataroll login</CodeBlock>
              
              <Callout type="info" title="Browser Authentication">
                This will open your browser to complete authentication securely.
              </Callout>

              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3 mt-6">
                3. Create your first migration
              </h3>
              <CodeBlock language="bash">dataroll migration create --name "initial_setup"</CodeBlock>
            </section>

            {/* Installation Section */}
            <section id="installation" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Installation</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                DataRoll can be installed via npm, yarn, or pnpm:
              </p>

              <CodeBlock language="bash">{`# npm
npm install -g @dataroll/cli

# yarn
yarn global add @dataroll/cli

# pnpm
pnpm add -g @dataroll/cli`}</CodeBlock>

              <Callout type="tip" title="Version Check">
                After installation, verify by running <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">dataroll --version</code>
              </Callout>
            </section>

            {/* Configuration Section */}
            <section id="configuration" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Configuration</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Configure DataRoll with a <code className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">dataroll.config.json</code> file:
              </p>

              <CodeBlock language="json">{`{
  "connections": {
    "production": {
      "type": "postgresql",
      "host": "localhost",
      "port": 5432,
      "database": "myapp",
      "ssl": true
    },
    "staging": {
      "type": "postgresql",
      "host": "staging-db.example.com",
      "port": 5432,
      "database": "myapp_staging"
    }
  },
  "migrations": {
    "directory": "./migrations",
    "tableName": "_dataroll_migrations"
  }
}`}</CodeBlock>

              <Callout type="warning" title="Sensitive Data">
                Never commit database passwords to version control. Use environment variables instead.
              </Callout>
            </section>

            {/* CLI Commands Section */}
            <section id="cli-commands" className="mb-12 scroll-mt-20">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">CLI Commands</h2>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Here are the most commonly used CLI commands:
              </p>

              <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900">
                      <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-100">Command</th>
                      <th className="px-4 py-3 text-left font-semibold text-zinc-900 dark:text-zinc-100">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll login</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Authenticate with DataRoll</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll migration create</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Create a new migration</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll migration run</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Run pending migrations</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll migration rollback</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Rollback last migration</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll connection add</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Add a database connection</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll connection list</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">List all connections</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3"><code className="text-blue-600 dark:text-blue-400">dataroll status</code></td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">Show migration status</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Help CTA */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">
                Need more help?
              </h3>
              <p className="text-blue-100 mb-6">
                Our support team is ready to assist you with any questions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Contact Support
                </Link>
                <Link
                  href="/help"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors"
                >
                  Help Center
                </Link>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Previous</p>
                  <Link href="/" className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400">
                    ← Home
                  </Link>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Next</p>
                  <Link href="/api-docs" className="font-medium text-zinc-900 dark:text-zinc-100 hover:text-blue-600 dark:hover:text-blue-400">
                    API Reference →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
