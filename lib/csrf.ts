import { randomBytes } from 'crypto';

// In production, use a proper secret from environment variables
const CSRF_SECRET = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production';

export function generateCSRFToken(): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(16).toString('hex');
  const data = `${timestamp}.${random}`;

  // Simple HMAC-like implementation (in production, use proper crypto)
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', CSRF_SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');

  return `${data}.${signature}`;
}

export function verifyCSRFToken(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [timestamp, random, signature] = parts;
    const data = `${timestamp}.${random}`;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', CSRF_SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    // Check if signature matches
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )) {
      return false;
    }

    // Check if token is not too old (5 minutes)
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (now - tokenTime > 5 * 60 * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function getCSRFTokenFromRequest(request: Request): string | null {
  const cookieToken = request.headers.get('cookie')?.split(';')
    .find(c => c.trim().startsWith('csrf-token='))
    ?.split('=')[1];

  const headerToken = request.headers.get('x-csrf-token');

  return headerToken || cookieToken || null;
}