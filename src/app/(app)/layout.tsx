import { Sidebar } from '@/components/layout/Sidebar'
import { QueryProvider } from '@/components/layout/QueryProvider'
import { Toaster } from '@/components/ui/sonner'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-0 md:ml-60 min-h-screen">
          <div className="max-w-6xl mx-auto px-6 py-6 pt-20 md:pt-6">
            {children}
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </QueryProvider>
  )
}
