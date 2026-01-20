import Link from "next/link"
import { ArrowLeft, Users, Target, Heart, Globe } from "lucide-react"

export default function AboutPage() {
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
        <div className="mb-16">
          <h1 className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            About DataRoll
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Making database management simple, reliable, and secure for everyone.
          </p>
        </div>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Our Mission
          </h2>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-8">
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
              At DataRoll, we believe that database management should be accessible to everyone.
              We're building tools that make it easy for developers and teams to manage their
              databases with confidence, from development to production.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
            Our Values
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Developer First
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We build tools that developers love to use. Simple, powerful, and intuitive.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Reliability
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Your database is critical. We ensure every migration runs smoothly and safely.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Community Driven
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We listen to our users and build features that solve real problems.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Open & Transparent
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We believe in transparency and building in public. Your trust matters.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
            Our Story
          </h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
              DataRoll was founded in 2025 by a team of developers who were frustrated with the
              complexity of database migration tools. We wanted something simpler, more reliable,
              and more developer-friendly.
            </p>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed mb-4">
              What started as a side project has grown into a platform trusted by thousands of
              developers and teams worldwide. We're proud to be making database management
              accessible to everyone, from solo developers to enterprise teams.
            </p>
            <p className="text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
              Today, DataRoll powers millions of database migrations every month, helping teams
              ship faster and with more confidence.
            </p>
          </div>
        </section>

        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            Join us on our journey
          </h3>
          <p className="text-blue-100 mb-6 text-lg">
            Be part of the future of database management
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signup"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/contact"
              className="px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
