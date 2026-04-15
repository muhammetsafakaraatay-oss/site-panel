'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const normalizedEmail = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithPassword({ 
      email: normalizedEmail, 
      password 
    })
    
    if (error) { 
      setError('E-posta veya şifre hatalı.') 
      setLoading(false) 
      return 
    }
    
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex w-full min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#1a1f2e] to-[#0F1117] items-center justify-center relative overflow-hidden p-12">
        <div className="absolute inset-0 opacity-10">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="absolute border border-white/20 rounded-full" style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">SitePanel</h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">Profesyonel site yönetim platformu.<br />Aidat takibi, gider yönetimi ve daha fazlası.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-center">
            {[{ label: 'Site', value: '120+' }, { label: 'Daire', value: '4.800+' }, { label: 'Tahsilat', value: '%94' }].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <div className="text-2xl font-bold text-indigo-400">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-bold">SitePanel</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Giriş Yap</h2>
          <p className="text-gray-500 mb-8">Hesabınıza devam edin</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">E-posta</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Şifre</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                Şifremi unuttum?
              </Link>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Giriş yapılıyor...</> : 'Giriş Yap'}
            </button>
          </form>
          <p className="text-center text-gray-600 text-sm mt-6">
            Hesabınız yok mu?{' '}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 transition-colors">Şirket kaydı oluşturun</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
