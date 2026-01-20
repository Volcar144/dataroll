import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'

export default async function MonitoringPage() {
  const headersList = await headers()
  const session = await getSession({
    headers: Object.fromEntries(headersList),
  } as any)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get user's teams for monitoring
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      _count: {
        select: {
          databaseConnections: true,
          migrations: true,
          auditLogs: true,
        },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Monitoring</h1>
        <p className="text-gray-500 mt-2">Monitor your database connections and migration activities</p>
      </div>

      <div className="grid gap-4">
        {teams.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-slate-900 rounded-lg">
            <p className="text-gray-500">No teams yet. Create a team to start monitoring.</p>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="p-6 border rounded-lg dark:border-slate-700">
              <h2 className="font-semibold text-lg">{team.name}</h2>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-gray-500">Connections</p>
                  <p className="text-2xl font-bold">{team._count.databaseConnections}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Migrations</p>
                  <p className="text-2xl font-bold">{team._count.migrations}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Audit Logs</p>
                  <p className="text-2xl font-bold">{team._count.auditLogs}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
