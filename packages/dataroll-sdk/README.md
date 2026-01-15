# DataRoll SDK

A TypeScript SDK for easy integration with DataRoll's database management platform.

## Installation

```bash
npm install @dataroll/sdk
```

## Quick Start

```typescript
import { createDataRollClient } from '@dataroll/sdk';

const client = createDataRollClient({
  apiKey: 'your-api-key',
  teamId: 'your-team-id', // optional
});

// Create a database connection
const connection = await client.createConnection({
  name: 'My App DB',
  type: 'POSTGRESQL',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'user',
  password: 'password',
});

// Create and execute a migration
const migration = await client.createMigration(connection.id, {
  name: 'add-users-table',
  type: 'PRISMA',
  content: `
    -- Prisma migration SQL here
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL
    );
  `,
});

await client.executeMigration(connection.id, migration.id);

// Check health status
const health = await client.getHealthStatus(connection.id);
console.log('DB Health:', health.status);

// Rollback if needed
await client.rollbackMigration(connection.id, migration.id);
```

## CLI Usage

The SDK includes a CLI tool for quick operations:

```bash
# Install globally
npm install -g @dataroll/sdk

# Or use npx
npx @dataroll/sdk --help

# Common commands
export DATAROLL_API_KEY=your-key

# List connections
dataroll connections

# Create connection
dataroll create-connection -n "My DB" --type POSTGRESQL -d mydb -h localhost -u user

# Run migration
dataroll migrate -c <connection-id> -n "add-table" -f migration.sql

# Check health
dataroll health -c <connection-id>

# Rollback
dataroll rollback -c <connection-id> -m <migration-id>
```

## API Reference

### DataRollClient

#### Connection Management
- `createConnection(data)` - Create a new database connection
- `getConnections()` - List all connections
- `testConnection(connectionId)` - Test a connection

#### Migration Management
- `createMigration(connectionId, data)` - Create a migration
- `executeMigration(connectionId, migrationId)` - Execute a migration
- `rollbackMigration(connectionId, migrationId)` - Rollback a migration
- `getMigrations(connectionId)` - List migrations

#### Monitoring
- `getHealthStatus(connectionId)` - Get connection health
- `performHealthCheck(connectionId)` - Run health check
- `getErrors(connectionId, options?)` - Get error logs
- `performTeamHealthChecks()` - Check all team connections

## Integration with Prisma

For automatic error reporting and migration management:

```typescript
import { setupPrismaIntegration } from '@dataroll/sdk';

// After creating client and connection
await setupPrismaIntegration(client, connectionId);

// Now Prisma operations will automatically report errors to DataRoll
```

## Error Handling

The SDK throws `DataRollError` for API errors:

```typescript
try {
  await client.executeMigration(connectionId, migrationId);
} catch (error) {
  if (error instanceof DataRollError) {
    console.error('DataRoll API Error:', error.message);
  }
}
```

## Configuration

```typescript
const config = {
  apiKey: 'your-api-key-from-dataroll-dashboard',
  baseUrl: 'https://dataroll.archhiem.top/api', // optional, defaults to production
  teamId: 'your-team-id', // optional, required for team operations
};
```

## CI/CD Integration

DataRoll provides seamless CI/CD integration for automated database operations.

### API-Based Integration

Submit migrations and queries directly via API:

```typescript
// Submit a migration for CI/CD execution
const result = await client.submitMigrationForCI(connectionId, {
  name: 'deploy-user-preferences',
  type: 'RAW_SQL',
  content: `
    ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
    CREATE INDEX idx_users_preferences ON users USING GIN (preferences);
  `,
  description: 'Add user preferences column',
  autoExecute: true,
});

// Submit a query for execution
const queryResult = await client.submitQueryForCI(connectionId, {
  query: 'SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL \'24 hours\'',
  description: 'Daily user count',
});
```

### Webhook-Based Integration

Create webhooks for automated CI/CD workflows:

```typescript
// Create a webhook for CI/CD notifications
const webhook = await client.createWebhook({
  name: 'CI/CD Pipeline',
  events: ['migration_completed', 'migration_failed', 'health_check_failed'],
  secret: 'your-webhook-secret', // optional, for signature verification
});

// Use the webhook URL in your CI/CD pipeline
console.log('Webhook URL:', webhook.url);
```

### CI/CD Pipeline Examples

#### GitHub Actions

```yaml
name: Database Migration
on:
  push:
    branches: [main]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Database Migration
        run: |
          curl -X POST "${{ secrets.DATAROLL_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -H "X-Webhook-Signature: ${{ secrets.WEBHOOK_SECRET }}" \
            -d '{
              "action": "migrate",
              "connectionId": "${{ secrets.DB_CONNECTION_ID }}",
              "data": {
                "name": "migration-${{ github.sha }}",
                "type": "RAW_SQL",
                "content": "$(cat migration.sql)",
                "description": "Deploy ${{ github.sha }}"
              },
              "metadata": {
                "commit": "${{ github.sha }}",
                "branch": "${{ github.ref_name }}",
                "author": "${{ github.actor }}",
                "pipeline": "github-actions"
              }
            }'
```

#### GitLab CI

```yaml
stages:
  - migrate

migrate:
  stage: migrate
  script:
    - |
      curl -X POST "$DATAROLL_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -H "X-Webhook-Signature: $WEBHOOK_SECRET" \
        -d "{
          \"action\": \"migrate\",
          \"connectionId\": \"$DB_CONNECTION_ID\",
          \"data\": {
            \"name\": \"migration-$CI_COMMIT_SHA\",
            \"type\": \"RAW_SQL\",
            \"content\": \"$(cat migration.sql)\",
            \"description\": \"Deploy $CI_COMMIT_SHA\"
          },
          \"metadata\": {
            \"commit\": \"$CI_COMMIT_SHA\",
            \"branch\": \"$CI_COMMIT_REF_NAME\",
            \"author\": \"$GITLAB_USER_NAME\",
            \"pipeline\": \"gitlab-ci\"
          }
        }"
```

#### Jenkins

```groovy
pipeline {
    agent any
    
    stages {
        stage('Database Migration') {
            steps {
                sh '''
                    curl -X POST "$DATAROLL_WEBHOOK_URL" \
                      -H "Content-Type: application/json" \
                      -H "X-Webhook-Signature: $WEBHOOK_SECRET" \
                      -d "{
                        \\"action\\": \\"migrate\\",
                        \\"connectionId\\": \\"$DB_CONNECTION_ID\\",
                        \\"data\\": {
                          \\"name\\": \\"migration-${BUILD_NUMBER}\\",
                          \\"type\\": \\"RAW_SQL\\",
                          \\"content\\": \\"$(cat migration.sql)\\",
                          \\"description\\": \\"Deploy ${BUILD_NUMBER}\\"
                        },
                        \\"metadata\\": {
                          \\"commit\\": \\"$GIT_COMMIT\\",
                          \\"branch\\": \\"$GIT_BRANCH\\",
                          \\"author\\": \\"$BUILD_USER\\",
                          \\"pipeline\\": \\"jenkins\\"
                        }
                      }"
                '''
            }
        }
    }
}
```

### CLI for CI/CD

Use the DataRoll CLI in your CI/CD pipelines:

```bash
# Login (first time setup)
dataroll login

# Submit migration via CLI
dataroll cicd-migrate \
  --connection-id $DB_CONNECTION_ID \
  --name "migration-$(git rev-parse HEAD)" \
  --file migration.sql \
  --description "Deploy $(git rev-parse HEAD)"

# Submit query via CLI
dataroll cicd-query \
  --connection-id $DB_CONNECTION_ID \
  --query "SELECT version()" \
  --description "Check database version"

# Manage webhooks
dataroll create-webhook \
  --name "Production Pipeline" \
  --events migration_completed,migration_failed \
  --secret $WEBHOOK_SECRET
```

## License

MIT