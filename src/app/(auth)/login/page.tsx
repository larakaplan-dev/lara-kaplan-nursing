import { LoginForm } from './LoginForm'
import { Heart } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-teal-900">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Lara Kaplan</h1>
          <p className="text-sm text-gray-500 mt-1">Nursing Care</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
