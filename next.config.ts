import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdfjs-dist'],
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withSentryConfig(nextConfig, {
  // Your Sentry org and project slugs — find them at sentry.io/settings/
  org: 'private-0fz',
  project: 'lara-kaplan-nursing',

  // Suppress Sentry CLI output unless running in CI
  silent: !process.env.CI,

  // Upload wider set of source maps for more accurate stack traces
  widenClientFileUpload: true,

  // Reduce bundle size by tree-shaking Sentry logger
  disableLogger: true,

  // Auto-instrument Vercel Cron Monitors (no-op if not using Vercel Crons)
  automaticVercelMonitors: true,
})
