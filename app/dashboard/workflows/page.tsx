import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Play, GitBranch, Clock, CheckCircle2, Plus } from 'lucide-react'

export default async function WorkflowsPage() {
  const headersList = await headers()
  const session = await getSession({
    headers: Object.fromEntries(headersList),
  } as any)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get user's workflows
  const workflows = await prisma.workflow.findMany({
    where: {
      createdBy: session.user.id,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          executions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-3 py-1 text-xs font-semibold tracking-wide dark:bg-white dark:text-zinc-900 mb-2">
                Automation
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Workflows</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Automate database operations with visual workflows</p>
            </div>
            <Link
              href="/dashboard/workflows/new"
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {workflows.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200/70 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/40">
              <GitBranch className="h-8 w-8 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No workflows yet</h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
              Create your first workflow to automate migrations, approvals, and database operations with a visual editor.
            </p>
            <Link
              href="/dashboard/workflows/new"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              <Plus className="h-4 w-4" />
              Create Your First Workflow
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Link
                key={workflow.id}
                href={`/dashboard/workflows/${workflow.id}`}
                className="group rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg text-zinc-900 dark:text-zinc-50 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
                          {workflow.name}
                        </h2>
                        {workflow.description && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{workflow.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-800">
                          <span className="h-2 w-2 rounded-full bg-zinc-500"></span>
                          {workflow.team.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                        <Play className="h-4 w-4" />
                        <span className="font-medium">{workflow._count.executions}</span>
                        <span>execution{workflow._count.executions !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-sm">
                        {workflow.isPublished ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Published</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            <span className="text-amber-600 dark:text-amber-400 font-medium">Draft</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm font-semibold text-violet-600 group-hover:text-violet-700 dark:text-violet-400 dark:group-hover:text-violet-300">
                    Open →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
