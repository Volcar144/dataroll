// examples/basic-usage.ts
import { createDataRollClient } from '../src';

async function main() {
  // Initialize client
  const client = createDataRollClient({
    apiKey: process.env.DATAROLL_API_KEY!,
    teamId: process.env.DATAROLL_TEAM_ID,
  });

  try {
    // Create connection
    console.log('Creating database connection...');
    const connection = await client.createConnection({
      name: 'Example App DB',
      type: 'POSTGRESQL',
      host: 'localhost',
      port: 5432,
      database: 'example_app',
      username: 'postgres',
      password: 'password',
      ssl: false,
    });
    console.log('Connection created:', connection.id);

    // Test connection
    console.log('Testing connection...');
    const testResult = await client.testConnection(connection.id);
    console.log('Connection test:', testResult);

    // Create migration
    console.log('Creating migration...');
    const migration = await client.createMigration(connection.id, {
      name: 'create-users-table',
      type: 'RAW_SQL',
      content: `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `,
    });
    console.log('Migration created:', migration.id);

    // Execute migration
    console.log('Executing migration...');
    const executeResult = await client.executeMigration(connection.id, migration.id);
    console.log('Migration executed:', executeResult);

    // Check health
    console.log('Checking health...');
    const health = await client.getHealthStatus(connection.id);
    console.log('Health status:', health);

    // Get errors
    console.log('Fetching recent errors...');
    const errors = await client.getErrors(connection.id, { limit: 5 });
    console.log('Recent errors:', errors);

    // Perform team health checks (if teamId provided)
    if (client.config.teamId) {
      console.log('Performing team health checks...');
      await client.performTeamHealthChecks();
      console.log('Team health checks completed');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}