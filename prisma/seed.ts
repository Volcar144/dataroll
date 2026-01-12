// Seed script for database
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo team and user for development
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@dataroll.dev' },
    update: {},
    create: {
      id: 'demo-user-id',
      email: 'demo@dataroll.dev',
      name: 'Demo User',
      emailVerified: new Date(),
    },
  })

  const demoTeam = await prisma.team.upsert({
    where: { slug: 'demo-team' },
    update: {},
    create: {
      id: 'demo-team-id',
      name: 'Demo Team',
      slug: 'demo-team',
      description: 'Demo team for testing',
      createdById: demoUser.id,
    },
  })

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: demoTeam.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      teamId: demoTeam.id,
      userId: demoUser.id,
      role: 'OWNER',
    },
  })

  console.log('Database seeded successfully!')
  console.log('Demo user: demo@dataroll.dev')
  console.log('Demo team: Demo Team')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })