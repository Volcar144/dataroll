"use client"

import { useState } from 'react'
import { useSession } from '@/lib/auth-service'
import { LinearClient } from '@linear/sdk'

const ISSUE_PRIORITIES = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
} as const

const ISSUE_TYPES = {
  bug: 'Bug Report',
  feature: 'Feature Request',
  improvement: 'Improvement',
  question: 'Question',
  other: 'Other'
} as const

type Priority = keyof typeof ISSUE_PRIORITIES
type IssueType = keyof typeof ISSUE_TYPES

export default function ReportIssuePage() {
  const { data: session } = useSession()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug' as IssueType,
    priority: 'medium' as Priority,
    steps: '',
    expected: '',
    actual: '',
    environment: '',
    browser: '',
    attachments: [] as File[]
  })

  const handleInputChange = (field: string, value: string | File[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      // Initialize Linear client
      const linearClient = new LinearClient({
        apiKey: process.env.NEXT_PUBLIC_LINEAR_API_KEY || 'lin_api_1234567890abcdef' // Fallback for demo
      })

      // Get the team (you would configure this)
      const teams = await linearClient.teams()
      const team = teams.nodes[0] // Use first team or configure specific team

      if (!team) {
        throw new Error('No Linear team found. Please configure Linear integration.')
      }

      // Create the issue description
      const issueDescription = `
## Issue Details

**Type:** ${ISSUE_TYPES[formData.type]}
**Priority:** ${ISSUE_PRIORITIES[formData.priority]}
**Reporter:** ${session?.user?.name || session?.user?.email || 'Anonymous'}
**Environment:** ${formData.environment || 'Not specified'}
**Browser:** ${formData.browser || 'Not specified'}

## Description
${formData.description}

${formData.steps ? `## Steps to Reproduce\n${formData.steps}` : ''}

${formData.expected ? `## Expected Behavior\n${formData.expected}` : ''}

${formData.actual ? `## Actual Behavior\n${formData.actual}` : ''}

---
*Reported via DataRoll Issue Reporter*
      `.trim()

      // Create the issue in Linear
      const issue = await linearClient.createIssue({
        teamId: team.id,
        title: `[${ISSUE_TYPES[formData.type]}] ${formData.title}`,
        description: issueDescription,
        priority: formData.priority === 'urgent' ? 1 :
                 formData.priority === 'high' ? 2 :
                 formData.priority === 'medium' ? 3 : 4,
        labelIds: [] // You can configure labels based on issue type
      })

      setSubmitStatus('success')

      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'bug',
        priority: 'medium',
        steps: '',
        expected: '',
        actual: '',
        environment: '',
        browser: '',
        attachments: []
      })

    } catch (error) {
      console.error('Error creating issue:', error)
      setSubmitStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create issue. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">Please sign in to report issues.</p>
          <a
            href="/auth/signin"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DR</span>
                </div>
                <span className="text-xl font-bold text-gray-900">DataRoll</span>
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                Dashboard
              </a>
              <a href="/profile" className="text-gray-600 hover:text-gray-900 transition-colors">
                Profile
              </a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
            <p className="mt-1 text-sm text-gray-600">
              Help us improve DataRoll by reporting bugs, requesting features, or asking questions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {/* Issue Type and Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as IssueType)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {Object.entries(ISSUE_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                  Priority *
                </label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value as Priority)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {Object.entries(ISSUE_PRIORITIES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the issue"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the issue"
                required
              />
            </div>

            {/* Steps to Reproduce (for bugs) */}
            {formData.type === 'bug' && (
              <div>
                <label htmlFor="steps" className="block text-sm font-medium text-gray-700 mb-2">
                  Steps to Reproduce
                </label>
                <textarea
                  id="steps"
                  value={formData.steps}
                  onChange={(e) => handleInputChange('steps', e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                />
              </div>
            )}

            {/* Expected vs Actual (for bugs) */}
            {formData.type === 'bug' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="expected" className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Behavior
                  </label>
                  <textarea
                    id="expected"
                    value={formData.expected}
                    onChange={(e) => handleInputChange('expected', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What should happen?"
                  />
                </div>
                <div>
                  <label htmlFor="actual" className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Behavior
                  </label>
                  <textarea
                    id="actual"
                    value={formData.actual}
                    onChange={(e) => handleInputChange('actual', e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What actually happens?"
                  />
                </div>
              </div>
            )}

            {/* Environment Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="environment" className="block text-sm font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <input
                  type="text"
                  id="environment"
                  value={formData.environment}
                  onChange={(e) => handleInputChange('environment', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Production, Staging, Development"
                />
              </div>
              <div>
                <label htmlFor="browser" className="block text-sm font-medium text-gray-700 mb-2">
                  Browser/OS
                </label>
                <input
                  type="text"
                  id="browser"
                  value={formData.browser}
                  onChange={(e) => handleInputChange('browser', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Chrome 120, Firefox 119"
                />
              </div>
            </div>

            {/* Submit Status */}
            {submitStatus === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Issue reported successfully!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Thank you for your report. Our team will review it and get back to you soon.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error reporting issue
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Issue'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}