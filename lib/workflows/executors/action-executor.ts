import { NodeExecutor, ExecutionContext, NodeExecutionResult, ValidationResult } from '../engine';
import { ActionNodeData } from '../types';
import { prisma } from '@/lib/prisma';

export class ActionExecutor implements NodeExecutor {
  async execute(
    node: any,
    context: ExecutionContext,
    previousOutput: any
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    const nodeData = node.data as ActionNodeData;

    try {
      let result: any;

      switch (nodeData.action) {
        case 'discover_migrations':
          result = await this.discoverMigrations(nodeData, context);
          break;

        case 'dry_run':
          result = await this.dryRun(nodeData, context);
          break;

        case 'execute_migrations':
          result = await this.executeMigrations(nodeData, context);
          break;

        case 'rollback':
          result = await this.rollback(nodeData, context);
          break;

        case 'custom_api_call':
          result = await this.customApiCall(nodeData, context);
          break;

        case 'database_query':
          result = await this.databaseQuery(nodeData, context);
          break;

        case 'database_migration':
          result = await this.databaseMigration(nodeData, context);
          break;

        case 'http_request':
          result = await this.httpRequest(nodeData, context);
          break;

        case 'shell_command':
          result = await this.shellCommand(nodeData, context);
          break;

        case 'set_variable':
          result = await this.setVariable(nodeData, context);
          break;

        case 'transform_data':
          result = await this.transformData(nodeData, context);
          break;

        default:
          throw new Error(`Unknown action type: ${nodeData.action}`);
      }

      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
      };
    }
  }

  validate(node: any): ValidationResult {
    const nodeData = node.data as ActionNodeData;
    const errors: string[] = [];

    if (!nodeData.action) {
      errors.push('Action type is required');
    }

    switch (nodeData.action) {
      case 'discover_migrations':
        if (!nodeData.connectionId) {
          errors.push('Connection ID is required for discover_migrations');
        }
        break;

      case 'dry_run':
      case 'execute_migrations':
        if (!nodeData.connectionId) {
          errors.push('Connection ID is required');
        }
        if (!nodeData.migrations) {
          errors.push('Migrations are required');
        }
        break;

      case 'rollback':
        if (!nodeData.connectionId) {
          errors.push('Connection ID is required for rollback');
        }
        break;

      case 'custom_api_call':
      case 'http_request':
        if (!nodeData.url) {
          errors.push('URL is required for API call');
        }
        break;

      case 'database_query':
        if (!nodeData.connectionId) {
          errors.push('Connection ID is required for database query');
        }
        if (!nodeData.query) {
          errors.push('Query is required for database query');
        }
        break;

      case 'database_migration':
        if (!nodeData.connectionId) {
          errors.push('Connection ID is required for database migration');
        }
        if (!nodeData.migrationId) {
          errors.push('Migration ID is required for database migration');
        }
        break;

      case 'shell_command':
        if (!nodeData.command) {
          errors.push('Command is required for shell command');
        }
        break;

      case 'set_variable':
        if (!nodeData.variableName) {
          errors.push('Variable name is required for set_variable');
        }
        break;

      case 'transform_data':
        if (!nodeData.input) {
          errors.push('Input is required for transform_data');
        }
        if (!nodeData.transformFunction) {
          errors.push('Transform function is required for transform_data');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private async discoverMigrations(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    // Get database connection
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would integrate with the existing migration discovery logic
    // For now, return a mock result
    const migrations = [
      {
        id: 'migration-1',
        name: 'create_users_table',
        version: '001',
        status: 'pending',
      },
      {
        id: 'migration-2',
        name: 'add_user_profiles',
        version: '002',
        status: 'pending',
      },
    ];

    return {
      migrations,
      connectionId,
    };
  }

  private async dryRun(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    // Get database connection
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would perform a dry-run of migrations
    // For now, return a mock result
    const dryRunResult = {
      success: true,
      changes: [
        { table: 'users', operation: 'CREATE TABLE', sql: 'CREATE TABLE users (...)' },
        { table: 'user_profiles', operation: 'ALTER TABLE', sql: 'ALTER TABLE users ADD COLUMN profile_id...' },
      ],
      warnings: [],
    };

    return {
      dryRunResult,
      connectionId,
      migrations: nodeData.migrations,
    };
  }

  private async executeMigrations(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    // Get database connection
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would execute the actual migrations
    // For now, return a mock result
    const executionResult = {
      success: true,
      executedMigrations: nodeData.migrations?.length || 0,
      duration: 1500, // ms
    };

    return {
      executionResult,
      connectionId,
      migrations: nodeData.migrations,
    };
  }

  private async rollback(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    // Get database connection
    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would perform a rollback operation
    // For PITR (Point-in-Time Recovery), this would restore to a previous state
    const rollbackResult = {
      success: true,
      rolledBackTo: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      affectedTables: ['users', 'user_profiles'],
    };

    return {
      rollbackResult,
      connectionId,
    };
  }

  private async customApiCall(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const { url, method = 'GET', headers = {}, body } = nodeData;

    try {
      const response = await fetch(url!, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseData = await response.json();

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        url,
        method,
      };
    } catch (error) {
      throw new Error(`API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async databaseQuery(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would execute the query using the database connection
    // For now, return a mock result
    const queryResult = {
      success: true,
      rows: [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
      ],
      rowCount: 2,
    };

    return {
      queryResult,
      connectionId,
      query: nodeData.query,
    };
  }

  private async databaseMigration(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const connectionId = nodeData.connectionId || context.connectionId;
    if (!connectionId) {
      throw new Error('Database connection ID is required');
    }

    const connection = await prisma.databaseConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      throw new Error(`Database connection not found: ${connectionId}`);
    }

    // This would execute a specific migration
    const migrationResult = {
      success: true,
      migrationId: nodeData.migrationId,
      executedAt: new Date().toISOString(),
    };

    return {
      migrationResult,
      connectionId,
      migrationId: nodeData.migrationId,
    };
  }

  private async httpRequest(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const { url, method = 'GET', headers = {}, body, timeout = 30000 } = nodeData;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url!, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseData,
        url,
        method,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`HTTP request timed out after ${timeout}ms`);
      }
      throw new Error(`HTTP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async shellCommand(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const { command, timeout = 30000 } = nodeData;

    // Note: In a real implementation, this would need to be executed securely
    // For now, return a mock result
    const commandResult = {
      success: true,
      stdout: 'Command executed successfully',
      stderr: '',
      exitCode: 0,
      duration: 1500, // ms
    };

    return {
      commandResult,
      command,
    };
  }

  private async setVariable(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const { variableName, value } = nodeData;

    // Set the variable in the execution context
    context.variables = context.variables || {};
    context.variables[variableName!] = value;

    return {
      variableName,
      value,
      set: true,
    };
  }

  private async transformData(
    nodeData: ActionNodeData,
    context: ExecutionContext
  ): Promise<any> {
    const { input, transformFunction } = nodeData;

    try {
      // Use a safer evaluation approach - only allow specific transform functions
      let result: any;

      switch (transformFunction) {
        case 'uppercase':
          result = typeof input === 'string' ? input.toUpperCase() : input;
          break;
        case 'lowercase':
          result = typeof input === 'string' ? input.toLowerCase() : input;
          break;
        case 'json_parse':
          result = typeof input === 'string' ? JSON.parse(input) : input;
          break;
        case 'json_stringify':
          result = JSON.stringify(input);
          break;
        case 'length':
          result = Array.isArray(input) ? input.length : (typeof input === 'string' ? input.length : input);
          break;
        case 'keys':
          result = (typeof input === 'object' && input !== null) ? Object.keys(input) : input;
          break;
        case 'values':
          result = (typeof input === 'object' && input !== null) ? Object.values(input) : input;
          break;
        default:
          // For custom functions, use a restricted approach
          if (transformFunction && typeof transformFunction === 'string') {
            // Only allow simple property access and basic operations
            if (/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)*$/.test(transformFunction)) {
              // Safe property access like "user.name" or "data.items"
              const properties = transformFunction.split('.');
              result = properties.reduce((obj, prop) => obj && obj[prop], input);
            } else {
              throw new Error(`Unsupported transform function: ${transformFunction}. Use predefined functions or safe property access.`);
            }
          } else {
            result = input;
          }
      }

      return {
        input,
        output: result,
        transformFunction,
      };
    } catch (error) {
      throw new Error(`Data transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}