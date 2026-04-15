'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0F1117] p-4">
      <div className="w-full max-w-md bg-[#13161f] border border-white/10 rounded-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-white text-2xl font-bold">Şifremi Unuttum</h2>
          <p className="text-gray-500 text-sm mt-2">E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@sirket.com"
            required
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          
          {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>}
          {message && <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm">{message}</div>}
          
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Şifre Sıfırlama Bağlantısı Gönder'}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  )
}
