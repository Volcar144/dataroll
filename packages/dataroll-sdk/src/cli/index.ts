#!/usr/bin/env node

import { Command } from 'commander';
import { createDataRollClient, login } from '../index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';

const program = new Command();

// Config file handling
const CONFIG_DIR = path.join(os.homedir(), '.dataroll');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return config;
    }
  } catch (error) {
    // Ignore errors and return empty config
  }
  return {};
}

function saveConfig(config: any) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function getApiKey() {
  // Check command line option first
  const apiKey = program.opts().apiKey;
  if (apiKey) return apiKey;

  // Check config file
  const config = loadConfig();
  return config.apiKey;
}

function getBaseUrl() {
  return program.opts().baseUrl || loadConfig().baseUrl || 'https://dataroll.archiem.top/api';
}

function getTeamId() {
  return program.opts().teamId || loadConfig().teamId;
}

export function readFileSafely(filePath: string): string {
  // Resolve the path to prevent directory traversal attacks
  const resolvedPath = path.resolve(filePath);

  // Find the repository root (git directory)
  let repoRoot = process.cwd();
  try {
    const gitDir = require('child_process').execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
    repoRoot = path.resolve(gitDir);
  } catch (error) {
    // If git command fails, fall back to current working directory
    // This maintains backward compatibility
  }

  // Ensure the resolved path is within the repository root
  // This prevents access to files outside the project while allowing
  // relative paths within the repo (common in CI/CD scenarios)
  if (!resolvedPath.startsWith(repoRoot)) {
    throw new Error('File path must be within the repository root directory');
  }

  // Check if file exists
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  return fs.readFileSync(resolvedPath, 'utf8');
}

program
  .name('dataroll')
  .description('DataRoll CLI for database management')
  .version('1.0.0')
  .option('-k, --api-key <key>', 'DataRoll API key')
  .option('-u, --base-url <url>', 'DataRoll API base URL')
  .option('-t, --team-id <id>', 'Team ID for team operations');

program
  .command('login')
  .description('Login to DataRoll and save API key')
  .option('-u, --base-url <url>', 'DataRoll API base URL')
  .action(async (options) => {
    try {
      const baseUrl = options.baseUrl || 'https://dataroll.archhiem.top/api';
      const result = await login({ baseUrl });

      // Save to config
      const config = loadConfig();
      config.apiKey = result.apiKey;
      config.baseUrl = baseUrl;
      if (result.teamId) {
        config.teamId = result.teamId;
      }
      saveConfig(config);

      console.log('✅ API key saved to ~/.dataroll/config.json');
      console.log('You can now use other CLI commands without specifying --api-key');
    } catch (error) {
      console.error('❌ Login failed:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('connections')
  .description('List database connections')
  .action(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const connections = await client.getConnections();
      console.table(connections);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('create-connection')
  .description('Create a new database connection')
  .requiredOption('-n, --name <name>', 'Connection name')
  .requiredOption('--type <type>', 'Database type (POSTGRESQL, MYSQL, SQLITE)')
  .requiredOption('-d, --database <name>', 'Database name')
  .option('-h, --host <host>', 'Database host')
  .option('-p, --port <port>', 'Database port', parseInt)
  .option('-u, --username <username>', 'Database username')
  .option('--password <password>', 'Database password')
  .option('--ssl', 'Enable SSL', false)
  .option('--url <url>', 'Direct connection URL')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const connection = await client.createConnection({
        name: options.name,
        type: options.type,
        host: options.host,
        port: options.port,
        database: options.database,
        username: options.username,
        password: options.password,
        ssl: options.ssl,
        url: options.url,
      });
      console.log('Connection created:', connection.id);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('migrate')
  .description('Create and execute a migration')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .requiredOption('-n, --name <name>', 'Migration name')
  .option('-f, --file <path>', 'SQL file path')
  .option('-t, --type <type>', 'Migration type (PRISMA, DRIZZLE, RAW_SQL)', 'RAW_SQL')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      let content = '';
      if (options.file) {
        content = readFileSafely(options.file);
      } else {
        console.error('SQL file required. Use -f or --file option.');
        process.exit(1);
      }

      const migration = await client.createMigration(options.connectionId, {
        name: options.name,
        type: options.type,
        content,
      });

      console.log('Migration created:', migration.id);

      const result = await client.executeMigration(options.connectionId, migration.id);
      console.log('Migration executed successfully');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('rollback')
  .description('Rollback a migration')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .requiredOption('-m, --migration-id <id>', 'Migration ID')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const result = await client.rollbackMigration(options.connectionId, options.migrationId);
      console.log('Migration rolled back successfully');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('health')
  .description('Check database health')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const health = await client.getHealthStatus(options.connectionId);
      console.log('Health Status:', health.status);
      console.log('Last Check:', health.lastCheck);
      console.log('Recent Errors:', health.recentErrorsCount);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('check-health')
  .description('Perform health check')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const result = await client.performHealthCheck(options.connectionId);
      console.log('Health check result:', result);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('team-health')
  .description('Perform health checks for all team connections')
  .action(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    if (!client.config.teamId) {
      console.error('Team ID required for team operations. Use -t or --team-id option.');
      process.exit(1);
    }

    try {
      await client.performTeamHealthChecks();
      console.log('Team health checks completed');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('cicd-migrate')
  .description('Submit a migration for CI/CD execution')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .requiredOption('-n, --name <name>', 'Migration name')
  .option('-f, --file <path>', 'SQL file path')
  .option('-t, --type <type>', 'Migration type (PRISMA, DRIZZLE, RAW_SQL)', 'RAW_SQL')
  .option('-d, --description <desc>', 'Migration description')
  .option('--no-execute', 'Create migration without executing it')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      let content = '';
      if (options.file) {
        content = readFileSafely(options.file);
      } else {
        console.error('SQL file required. Use -f or --file option.');
        process.exit(1);
      }

      const result = await client.submitMigrationForCI(options.connectionId, {
        name: options.name,
        type: options.type,
        content,
        description: options.description,
        autoExecute: !options.noExecute,
      });

      console.log('Migration submitted for CI/CD:', result.migration.id);
      console.log('Status:', result.migration.status);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('cicd-query')
  .description('Submit a query for CI/CD execution')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .requiredOption('-q, --query <sql>', 'SQL query to execute')
  .option('-d, --description <desc>', 'Query description')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const result = await client.submitQueryForCI(options.connectionId, {
        query: options.query,
        description: options.description,
      });

      console.log('Query submitted for CI/CD execution');
      console.log('Result:', result.message);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('webhooks')
  .description('List webhooks')
  .action(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const webhooks = await client.getWebhooks();
      console.table(webhooks);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('create-webhook')
  .description('Create a webhook for CI/CD integration')
  .requiredOption('-n, --name <name>', 'Webhook name')
  .option('-u, --url <url>', 'Webhook URL (optional, will generate if not provided)')
  .option('-e, --events <events>', 'Comma-separated list of events', 'migration_completed,migration_failed')
  .option('-s, --secret <secret>', 'Webhook secret for signature verification')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const events = options.events.split(',').map((e: string) => e.trim());
      const webhook = await client.createWebhook({
        name: options.name,
        url: options.url,
        events,
        secret: options.secret,
      });

      console.log('Webhook created:', webhook.id);
      console.log('URL:', webhook.url);
      if (webhook.secret) {
        console.log('Secret:', webhook.secret);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('generate-proxy-url')
  .description('Generate a proxy database URL for review-based queries')
  .requiredOption('-c, --connection-id <id>', 'Connection ID')
  .action(async (options) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const result = await client.generateProxyUrl(options.connectionId);
      console.log('Proxy URL generated successfully!');
      console.log('Connection:', result.connectionName);
      console.log('Proxy URL:', result.proxyUrl);
      console.log('\nUse this URL in your Prisma schema instead of the direct database URL.');
      console.log('All queries will be sent to DataRoll for review before execution.');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('proxy-connections')
  .description('List proxy connections')
  .action(async () => {
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('API key required. Run "dataroll login" first or use --api-key option.');
      process.exit(1);
    }

    const client = createDataRollClient({
      apiKey,
      baseUrl: getBaseUrl(),
      teamId: getTeamId(),
    });

    try {
      const proxies = await client.getProxyConnections();
      console.table(proxies);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });