"use client"

import { useState, FormEvent } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, MessageSquare, Send, CheckCircle2, Loader2, AlertCircle, X, Building2, Clock, Phone, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

type ContactCategory = "general" | "support" | "sales" | "partnership"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general" as ContactCategory,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Validate fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError("Please fill in all required fields.")
      setLoading(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address.")
      setLoading(false)
      return
    }

    try {
      // Simulate API call - in production, replace with actual endpoint
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // In production, uncomment and configure:
      // const res = await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData),
      // })
      // if (!res.ok) throw new Error('Failed to send message')
      
      setSuccess(true)
      setFormData({ name: "", email: "", subject: "", message: "", category: "general" })
    } catch (err) {
      setError("Failed to send your message. Please try again or email us directly.")
    } finally {
      setLoading(false)
    }
  }

  const categories = [
    { value: "general", label: "General Inquiry", description: "Questions about DataRoll" },
    { value: "support", label: "Technical Support", description: "Help with your account or features" },
    { value: "sales", label: "Sales", description: "Pricing and enterprise plans" },
    { value: "partnership", label: "Partnership", description: "Business opportunities" },
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
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-4">
            <MessageSquare className="w-4 h-4" />
            We'd love to hear from you
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Have questions about DataRoll? We're here to help. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-zinc-800/50 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Email Us
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              For general inquiries and support
            </p>
            <a
              href="mailto:support@dataroll.dev"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              support@dataroll.dev
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-zinc-800/50 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Community Chat
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Join our Discord community
            </p>
            <a
              href="https://discord.gg/dataroll"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Join Discord →
            </a>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg dark:hover:shadow-zinc-800/50 hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Response Time
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              We typically respond within
            </p>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">
              24 hours
            </span>
          </div>
        </div>

        {/* Form Section */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8">
            {success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Message Sent!
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  Thank you for reaching out. We'll get back to you as soon as possible.
                </p>
                <Button onClick={() => setSuccess(false)} variant="outline">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">
                  Send us a message
                </h2>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl mb-6 animate-in slide-in-from-top-2">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    <button onClick={() => setError("")} className="ml-auto text-red-600 dark:text-red-400 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                      What can we help you with?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {categories.map(cat => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat.value as ContactCategory })}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            formData.category === cat.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20'
                              : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                          }`}
                        >
                          <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{cat.label}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{cat.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Subject
                    </label>
                    <input
                      type="text"
                      id="subject"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-none"
                      placeholder="Tell us more about your inquiry..."
                      required
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      {formData.message.length}/1000 characters
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>

          {/* Sidebar Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200 dark:border-blue-900 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Enterprise Support
              </h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                Need dedicated support for your organization? Our enterprise plan includes:
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Priority response times
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Dedicated support engineer
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Custom onboarding
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  SLA guarantees
                </li>
              </ul>
              <Link
                href="/pricing"
                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View Enterprise Plans →
              </Link>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Quick Links
              </h3>
              <div className="space-y-3">
                <Link href="/docs" className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Documentation</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-zinc-400" />
                </Link>
                <Link href="/help" className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Help Center</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-zinc-400" />
                </Link>
                <Link href="/report-issue" className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Report an Issue</span>
                  <ArrowLeft className="w-4 h-4 rotate-180 text-zinc-400" />
                </Link>
              </div>
            </div>

            <div className="bg-zinc-900 dark:bg-zinc-800 rounded-xl p-6 text-white">
              <h3 className="text-lg font-semibold mb-3">🌍 Global Availability</h3>
              <p className="text-sm text-zinc-300 mb-4">
                Our team is distributed worldwide to provide you with the best support across all timezones.
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="font-medium">Americas</p>
                  <p className="text-zinc-400">9am - 6pm EST</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="font-medium">Europe</p>
                  <p className="text-zinc-400">9am - 6pm CET</p>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <p className="font-medium">Asia</p>
                  <p className="text-zinc-400">9am - 6pm SGT</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
