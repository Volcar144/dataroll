import type { NextConfig } from "next";
import { withPostHogConfig } from "@posthog/nextjs-config";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        // Additional headers for API routes
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

// Only enable PostHog source maps if we have valid API credentials
const shouldEnableSourceMaps = 
  process.env.POSTHOG_API_KEY?.startsWith('phx_') && 
  process.env.POSTHOG_ENV_ID;

export default shouldEnableSourceMaps
  ? withPostHogConfig(nextConfig, {
      personalApiKey: process.env.POSTHOG_API_KEY!, // Personal API Key (starts with phx_)
      envId: process.env.POSTHOG_ENV_ID!, // Environment ID
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST, // PostHog instance URL
      sourcemaps: {
        enabled: process.env.NODE_ENV === 'production', // Enable on production builds
        project: "dataroll", // Project name
        deleteAfterUpload: true, // Delete sourcemaps after upload
      },
    })
  : nextConfig;
