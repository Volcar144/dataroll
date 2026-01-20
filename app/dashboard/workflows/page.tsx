import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-gray-500 mt-2">Automate your database operations with workflows</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/workflows/new">Create Workflow</Link>
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <p className="text-gray-500 mb-4">No workflows yet. Create one to get started.</p>
          <Button asChild>
            <Link href="/dashboard/workflows/new">Create Your First Workflow</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="p-6 border rounded-lg dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{workflow.name}</h2>
                  {workflow.description && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{workflow.description}</p>}
                  <div className="flex gap-4 mt-4 text-sm text-gray-500">
                    <span>Team: {workflow.team.name}</span>
                    <span>{workflow._count.executions} execution{workflow._count.executions !== 1 ? 's' : ''}</span>
                    <span>Status: {workflow.isPublished ? '🟢 Published' : '🔴 Draft'}</span>
                  </div>
                </div>
                <Link href={`/dashboard/workflows/${workflow.id}`}>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
