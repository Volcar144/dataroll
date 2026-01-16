import axios, { AxiosInstance } from 'axios';
import { z } from 'zod';
import { createAuthClient } from "better-auth/client";
import { deviceAuthorizationClient } from "better-auth/client/plugins";

// Configuration schema
const ConfigSchema = z.object({
  apiKey: z.string(),
  baseUrl: z.string().optional().default('https://dataroll.archiem.top/api'),
  teamId: z.string().optional(),
});

export type DataRollConfig = z.infer<typeof ConfigSchema>;

// Device authorization schemas
const DeviceCodeResponseSchema = z.object({
  device_code: z.string(),
  user_code: z.string(),
  verification_uri: z.string(),
  expires_in: z.number(),
  interval: z.number(),
});

const DeviceTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number(),
  api_key: z.string(),
});

// Response schemas
const ConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['POSTGRESQL', 'MYSQL', 'SQLITE']),
  healthStatus: z.enum(['HEALTHY', 'UNHEALTHY', 'UNKNOWN']).optional(),
});

const MigrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  executedAt: z.string().optional(),
});

const HealthStatusSchema = z.object({
  status: z.enum(['HEALTHY', 'UNHEALTHY', 'UNKNOWN']),
  lastCheck: z.string().optional(),
  recentErrorsCount: z.number(),
});

const ErrorSchema = z.object({
  id: z.string(),
  operation: z.string(),
  errorType: z.string(),
  message: z.string(),
  occurredAt: z.string(),
});

/**
 * DataRoll SDK Client
 */
export class DataRollClient {
  private client: AxiosInstance;
  public config: DataRollConfig;

  constructor(config: DataRollConfig) {
    this.config = ConfigSchema.parse(config);
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Connection Management
  async createConnection(data: {
    name: string;
    type: 'POSTGRESQL' | 'MYSQL' | 'SQLITE';
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
    url?: string;
  }) {
    const response = await this.client.post('/connections', data);
    return ConnectionSchema.parse(response.data);
  }

  async getConnections() {
    const response = await this.client.get('/connections');
    return z.array(ConnectionSchema).parse(response.data);
  }

  async testConnection(connectionId: string) {
    const response = await this.client.post(`/connections/test`, { connectionId });
    return response.data;
  }

  // Migration Management
  async createMigration(connectionId: string, data: {
    name: string;
    type: 'PRISMA' | 'DRIZZLE' | 'RAW_SQL';
    content: string;
  }) {
    const response = await this.client.post(`/connections/${connectionId}/migrations`, data);
    return MigrationSchema.parse(response.data);
  }

  async executeMigration(connectionId: string, migrationId: string) {
    const response = await this.client.post(`/connections/${connectionId}/migrations/${migrationId}/execute`);
    return response.data;
  }

  async rollbackMigration(connectionId: string, migrationId: string) {
    const response = await this.client.post(`/connections/${connectionId}/migrations/${migrationId}/rollback`, {
      confirm: true,
    });
    return response.data;
  }

  async getMigrations(connectionId: string) {
    const response = await this.client.get(`/connections/${connectionId}/migrations`);
    return z.array(MigrationSchema).parse(response.data);
  }

  // Monitoring
  async getHealthStatus(connectionId: string) {
    const response = await this.client.get(`/connections/${connectionId}/monitoring`);
    return HealthStatusSchema.parse(response.data.health);
  }

  async performHealthCheck(connectionId: string) {
    const response = await this.client.post(`/connections/${connectionId}/monitoring`);
    return response.data;
  }

  async getErrors(connectionId: string, options?: {
    limit?: number;
    operation?: string;
    errorType?: string;
  }) {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.operation) params.append('operation', options.operation);
    if (options?.errorType) params.append('errorType', options.errorType);

    const response = await this.client.get(`/connections/${connectionId}/monitoring/errors?${params}`);
    return z.array(ErrorSchema).parse(response.data);
  }

  // Team Monitoring
  async performTeamHealthChecks() {
    if (!this.config.teamId) throw new Error('Team ID required for team operations');
    const response = await this.client.post(`/teams/${this.config.teamId}/monitoring`);
    return response.data;
  }

  // CI/CD Integration
  async submitMigrationForCI(connectionId: string, data: {
    name: string;
    type: 'PRISMA' | 'DRIZZLE' | 'RAW_SQL';
    content: string;
    description?: string;
    autoExecute?: boolean;
  }) {
    const response = await this.client.post('/cicd', {
      connectionId,
      ...data,
      autoExecute: data.autoExecute ?? true,
    });
    return response.data;
  }

  async submitQueryForCI(connectionId: string, data: {
    query: string;
    description?: string;
  }) {
    const response = await this.client.post('/cicd?action=query', {
      connectionId,
      ...data,
    });
    return response.data;
  }

  async createWebhook(data: {
    name: string;
    url?: string;
    events: string[];
    secret?: string;
  }) {
    const response = await this.client.post('/webhooks', data);
    return response.data;
  }

  async getWebhooks() {
    const response = await this.client.get('/webhooks');
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    const response = await this.client.delete(`/webhooks/${webhookId}`);
    return response.data;
  }

  // Proxy Database URLs
  async generateProxyUrl(connectionId: string) {
    const response = await this.client.post(`/connections/${connectionId}/proxy`);
    return response.data;
  }

  async getProxyConnections() {
    const response = await this.client.get('/proxy');
    return response.data;
  }

  async deactivateProxy(proxyId: string) {
    const response = await this.client.delete(`/proxy/${proxyId}`);
    return response.data;
  }

  // Device Authorization
  async requestDeviceCode() {
    const response = await axios.post(`${this.config.baseUrl.replace('/api', '')}/api/auth/device/code`);
    return DeviceCodeResponseSchema.parse(response.data);
  }

  async pollForDeviceToken(deviceCode: string) {
    const response = await axios.post(`${this.config.baseUrl.replace('/api', '')}/api/auth/device/token`, {
      device_code: deviceCode,
    });
    return DeviceTokenResponseSchema.parse(response.data);
  }
}

// Convenience functions
export function createDataRollClient(config: DataRollConfig) {
  return new DataRollClient(config);
}

// Login functionality
export async function login(options: { baseUrl?: string } = {}): Promise<{ apiKey: string; teamId?: string }> {
  const baseUrl = options.baseUrl || 'https://dataroll.archhiem.top/api';
  const authBaseUrl = baseUrl.replace('/api', '');

  const authClient = createAuthClient({
    baseURL: authBaseUrl,
    plugins: [deviceAuthorizationClient()],
  });

  try {
    console.log('\n🔐 DataRoll CLI Login');
    console.log('====================');
    console.log('⏳ Requesting device authorization...');

    // Request device code
    const { data, error } = await authClient.device.code({
      client_id: "dataroll-cli",
      scope: "openid profile email",
    });

    if (error || !data) {
      throw new Error(error?.error_description || 'Failed to get device code');
    }

    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      interval = 5,
    } = data;

    console.log('\n📱 Device Authorization in Progress');
    console.log(`Please visit: ${verification_uri}`);
    console.log(`Enter code: ${user_code}\n`);
    console.log(`⏳ Waiting for authorization... (polling every ${interval}s)`);

    // Poll for token
    const tokenData = await pollForToken(authClient, device_code, interval);

    console.log('✅ Login successful!');
    console.log(`API Key: ${tokenData.api_key}\n`);

    return {
      apiKey: tokenData.api_key,
    };
  } catch (error) {
    throw new DataRollError('Login failed: ' + (error instanceof Error ? error.message : String(error)));
  }
}

async function pollForToken(authClient: any, deviceCode: string, interval: number) {
  let pollingInterval = interval;

  return new Promise<any>((resolve, reject) => {
    const poll = async () => {
      try {
        const { data, error } = await authClient.device.token({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          device_code: deviceCode,
          client_id: "dataroll-cli",
        });

        if (data?.access_token) {
          // Get API key from the response
          // The API key should be included in the token response
          resolve(data);
        } else if (error) {
          switch (error.error) {
            case "authorization_pending":
              // Continue polling silently
              break;
            case "slow_down":
              pollingInterval += 5;
              console.log(`⚠️  Slowing down polling to ${pollingInterval}s`);
              break;
            case "access_denied":
              reject(new Error("Access was denied by the user"));
              break;
            case "expired_token":
              reject(new Error("The device code has expired. Please try again."));
              break;
            default:
              reject(new Error(error.error_description || 'Unknown error'));
          }
        }
      } catch (err: any) {
        reject(new Error('Network error: ' + err.message));
      }

      // Schedule next poll
      setTimeout(poll, pollingInterval * 1000);
    };

    // Start polling
    setTimeout(poll, pollingInterval * 1000);
  });
}

// Error handling
export class DataRollError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'DataRollError';
  }
}

// Auto-setup for Prisma integration
export async function setupPrismaIntegration(client: DataRollClient, connectionId: string) {
  // This would patch Prisma client to report errors to DataRoll
  // Implementation would depend on how Prisma is used in the app
  console.log('Prisma integration setup for connection:', connectionId);
}