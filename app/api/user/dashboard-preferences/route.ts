import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

// GET /api/user/dashboard-preferences - Get user's dashboard layout preferences
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Try to get existing preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check for user metadata or a dedicated preferences table
    // For now, we'll store in a simple key-value approach
    // In production, you might want a dedicated UserPreferences model
    const preferences = await prisma.$queryRaw<{ value: string }[]>`
      SELECT value FROM user_preferences 
      WHERE user_id = ${session.user.id} AND key = 'dashboard_widgets'
      LIMIT 1
    `.catch(() => []);

    if (preferences.length > 0) {
      return NextResponse.json(JSON.parse(preferences[0].value));
    }

    // Return default empty preferences
    return NextResponse.json({ widgets: [] });
  } catch (error) {
    console.error('Error fetching dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}

// POST /api/user/dashboard-preferences - Save user's dashboard layout preferences
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { widgets } = body;

    if (!widgets || !Array.isArray(widgets)) {
      return NextResponse.json(
        { error: 'Invalid widgets data' },
        { status: 400 }
      );
    }

    // Validate widget structure
    for (const widget of widgets) {
      if (!widget.id || !widget.type || typeof widget.x !== 'number' || typeof widget.y !== 'number') {
        return NextResponse.json(
          { error: 'Invalid widget structure' },
          { status: 400 }
        );
      }
    }

    // Upsert the preferences
    // Using raw query for flexibility - in production, use a proper model
    await prisma.$executeRaw`
      INSERT INTO user_preferences (id, user_id, key, value, updated_at)
      VALUES (gen_random_uuid(), ${session.user.id}, 'dashboard_widgets', ${JSON.stringify({ widgets })}, NOW())
      ON CONFLICT (user_id, key) 
      DO UPDATE SET value = ${JSON.stringify({ widgets })}, updated_at = NOW()
    `.catch(async () => {
      // Fallback: Create the table if it doesn't exist and retry
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          user_id TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, key)
        )
      `;
      await prisma.$executeRaw`
        INSERT INTO user_preferences (id, user_id, key, value, updated_at)
        VALUES (gen_random_uuid()::text, ${session.user.id}, 'dashboard_widgets', ${JSON.stringify({ widgets })}, NOW())
        ON CONFLICT (user_id, key) 
        DO UPDATE SET value = ${JSON.stringify({ widgets })}, updated_at = NOW()
      `;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving dashboard preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}
