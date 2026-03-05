import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of traces in development; lower for production if needed
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Disable Sentry debug output in the browser console
  debug: false,
})
