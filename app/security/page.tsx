import Link from "next/link"
import { ArrowLeft, Shield, Lock, Eye, Server, FileText, CheckCircle, AlertCircle } from "lucide-react"

export default function SecurityPage() {
  const features = [
    {
      icon: Lock,
      title: "End-to-End Encryption",
      description: "All data is encrypted in transit and at rest using industry-standard AES-256 encryption.",
    },
    {
      icon: Eye,
      title: "Audit Logs",
      description: "Comprehensive audit logs track all actions and access to your data.",
    },
    {
      icon: Server,
      title: "Secure Infrastructure",
      description: "Hosted on Vercel with multi-region redundancy and DDoS protection.",
    },
    {
      icon: FileText,
      title: "Privacy First",
      description: "We comply with GDPR and other privacy regulations worldwide.",
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
        <div className="mb-16 text-center">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Security & Compliance
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Your data security is our top priority
          </p>
        </div>

        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Our Commitment to Security
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
              <ul className="space-y-4 text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>All database credentials are encrypted using AES-256 encryption</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Two-factor authentication (2FA) available for all accounts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Regular penetration testing and security audits</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Role-based access control (RBAC) for team management</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>Automated backups with point-in-time recovery</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span>24/7 security monitoring and incident response</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Responsible Disclosure
          </h2>
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              If you discover a security vulnerability, please report it to us responsibly. We take
              all security reports seriously and will respond promptly.
            </p>
            <p className="text-zinc-700 dark:text-zinc-300 mb-6">
              Email security concerns to:{" "}
              <a
                href="mailto:security@dataroll.dev"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                security@dataroll.dev
              </a>
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We appreciate your help in keeping DataRoll secure for everyone.
            </p>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Questions about security?
          </h3>
          <p className="text-blue-100 mb-6 text-lg">
            Our security team is here to answer any questions you may have.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Contact Security Team
          </Link>
        </div>
      </main>
    </div>
  )
}
