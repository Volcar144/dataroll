import Link from "next/link"
import { ArrowLeft, Book, Code, FileText, GitBranch, Terminal } from "lucide-react"

export default function DocsPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">DR</span>
            </div>
            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">DataRoll</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <div className="sticky top-24 space-y-6">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <div key={section.title}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {section.title}
                      </h3>
                    </div>
                    <ul className="space-y-2 pl-6">
                      {section.items.map((item) => (
                        <li key={item.name}>
                          <a
                            href={item.href}
                            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {item.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </aside>

          {/* Content */}
          <main className="md:col-span-3">
            <div className="prose dark:prose-invert max-w-none">
              <h1>Documentation</h1>
              <p className="lead">
                Welcome to DataRoll documentation. Learn how to manage your database migrations
                with confidence.
              </p>

              <h2 id="quick-start">Quick Start</h2>
              <p>Get started with DataRoll in minutes.</p>
              
              <h3>1. Install the CLI</h3>
              <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-800 dark:border-zinc-700">
                <code>npm install -g @dataroll/cli</code>
              </pre>

              <h3>2. Authenticate</h3>
              <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-800 dark:border-zinc-700">
                <code>dataroll login</code>
              </pre>

              <h3>3. Create your first migration</h3>
              <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-800 dark:border-zinc-700">
                <code>dataroll migration create --name "initial_setup"</code>
              </pre>

              <h2 id="installation">Installation</h2>
              <p>DataRoll can be installed via npm, yarn, or pnpm:</p>
              <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-800 dark:border-zinc-700">
                <code>{`# npm
npm install -g @dataroll/cli

# yarn
yarn global add @dataroll/cli

# pnpm
pnpm add -g @dataroll/cli`}</code>
              </pre>

              <h2 id="configuration">Configuration</h2>
              <p>Configure DataRoll with a <code>dataroll.config.json</code> file:</p>
              <pre className="bg-zinc-900 dark:bg-zinc-950 text-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-800 dark:border-zinc-700">
                <code>{`{
  "connections": {
    "production": {
      "type": "postgresql",
      "host": "localhost",
      "port": 5432,
      "database": "myapp"
    }
  }
}`}</code>
              </pre>

              <h2 id="cli-commands">CLI Commands</h2>
              <p>Common CLI commands:</p>
              <ul>
                <li><code>dataroll login</code> - Authenticate with DataRoll</li>
                <li><code>dataroll migration create</code> - Create a new migration</li>
                <li><code>dataroll migration run</code> - Run pending migrations</li>
                <li><code>dataroll migration rollback</code> - Rollback last migration</li>
                <li><code>dataroll connection add</code> - Add a database connection</li>
                <li><code>dataroll connection list</code> - List all connections</li>
              </ul>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Need more help?
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  Check out our full documentation or reach out to our support team.
                </p>
                <div className="flex gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Contact Support
                  </Link>
                  <Link
                    href="/api"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                  >
                    API Reference
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
