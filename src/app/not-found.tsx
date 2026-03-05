import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <p className="text-5xl font-bold text-muted-foreground/30">404</p>
      <p className="text-sm text-muted-foreground">This page does not exist.</p>
      <Link
        href="/dashboard"
        className="text-sm text-teal-900 underline underline-offset-4 hover:opacity-70"
      >
        Back to dashboard
      </Link>
    </div>
  )
}
