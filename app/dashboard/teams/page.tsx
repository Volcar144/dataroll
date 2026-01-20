import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function TeamsPage() {
  const headersList = await headers()
  const session = await getSession({
    headers: Object.fromEntries(headersList),
  } as any)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get user's teams
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      createdBy: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          databaseConnections: true,
        },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teams</h1>
          <p className="text-gray-500 mt-2">Manage your teams and team members</p>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-900 rounded-lg">
          <p className="text-gray-500">No teams yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <div key={team.id} className="p-6 border rounded-lg dark:border-slate-700 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{team.name}</h2>
                  {team.description && <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{team.description}</p>}
                  <div className="flex gap-4 mt-4 text-sm text-gray-500">
                    <span>{team._count.members} member{team._count.members !== 1 ? 's' : ''}</span>
                    <span>{team._count.databaseConnections} connection{team._count.databaseConnections !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <Link href={`/dashboard/teams/${team.id}`}>
                  <Button variant="outline" size="sm">
                    View Details
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
