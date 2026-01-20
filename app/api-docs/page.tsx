import Link from "next/link"
import { ArrowLeft, Code2, Database, GitBranch, Key } from "lucide-react"

export default function APIPage() {
  const endpoints = [
    {
      method: "GET",
      path: "/api/connections",
      description: "List all database connections",
    },
    {
      method: "POST",
      path: "/api/connections",
      description: "Create a new database connection",
    },
    {
      method: "GET",
      path: "/api/migrations",
      description: "List all migrations",
    },
    {
      method: "POST",
      path: "/api/migrations",
      description: "Create a new migration",
    },
    {
      method: "POST",
      path: "/api/migrations/:id/run",
      description: "Execute a migration",
    },
    {
      method: "POST",
      path: "/api/migrations/:id/rollback",
      description: "Rollback a migration",
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

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            API Reference
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Complete REST API documentation for DataRoll
          </p>
        </div>

        {/* Authentication */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Authentication
            </h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              All API requests require authentication using an API key. Include your API key in the
              Authorization header:
            </p>
            <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto">
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </pre>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-4">
              You can generate an API key from your{" "}
              <Link href="/profile" className="text-blue-600 dark:text-blue-400 hover:underline">
                profile settings
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Base URL */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <Database className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Base URL
            </h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg overflow-x-auto">
              <code>https://api.dataroll.dev/v1</code>
            </pre>
          </div>
        </section>

        {/* Endpoints */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Endpoints
            </h2>
          </div>
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <div
                key={`${endpoint.method}-${endpoint.path}`}
                className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6"
              >
                <div className="flex items-center gap-4 mb-2">
                  <span
                    className={`px-3 py-1 rounded-lg font-mono text-sm font-semibold ${
                      endpoint.method === "GET"
                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-zinc-900 dark:text-zinc-100 font-mono">
                    {endpoint.path}
                  </code>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400">{endpoint.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SDK */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Code2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              SDK
            </h2>
          </div>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              We provide official SDKs for popular languages:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Node.js / TypeScript
                </h4>
                <pre className="text-sm bg-zinc-900 text-zinc-100 p-3 rounded overflow-x-auto">
                  <code>npm install @dataroll/sdk</code>
                </pre>
              </div>
              <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Python
                </h4>
                <pre className="text-sm bg-zinc-900 text-zinc-100 p-3 rounded overflow-x-auto">
                  <code>pip install dataroll</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-8">
          <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Need help with integration?
          </h3>
          <p className="text-zinc-700 dark:text-zinc-300 mb-6">
            Our team is here to help you get started with the DataRoll API.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Contact Support
          </Link>
        </div>
      </main>
    </div>
  )
}
