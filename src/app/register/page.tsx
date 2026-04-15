'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })
      
      if (authError || !authData.user) { 
        setError(authError?.message ?? 'Kayıt oluşturulamadı.') 
        setLoading(false) 
        return 
      }
      
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ 
          name: companyName, 
          email, 
          phone: companyPhone || null, 
          address: companyCity || null 
        })
        .select()
        .single()
      
      if (companyError || !company) { 
        setError('Şirket oluşturulamadı: ' + companyError?.message) 
        setLoading(false) 
        return 
      }
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({ 
          id: authData.user.id, 
          company_id: company.id, 
          full_name: fullName, 
          role: 'owner' 
        })
      
      if (profileError) {
        console.error('Profil hatası:', profileError)
        setError('Profil oluşturulamadı. Lütfen tekrar deneyin.')
        setLoading(false)
        return
      }
      
      router.push('/')
      router.refresh()
    } catch (err) {
      console.error('Beklenmeyen hata:', err)
      setError('Beklenmeyen bir hata oluştu.')
      setLoading(false)
    }
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
          <p className="text-gray-400 text-lg leading-relaxed max-w-sm">Dakikalar içinde kurulum yapın,<br />hemen yönetmeye başlayın.</p>
          <div className="mt-10 space-y-3 text-left">
            {['Sınırsız site ve daire ekleyin','Otomatik aidat takibi yapın','WhatsApp hatırlatma gönderin','Gider ve gelir raporları alın'].map((item) => (
              <div key={item} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span className="text-gray-300 text-sm">{item}</span>
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
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? 'bg-indigo-600 text-white' : 'bg-white/10 text-gray-500'}`}>{s}</div>
                {s < 2 && <div className={`w-12 h-0.5 transition-all ${step > s ? 'bg-indigo-600' : 'bg-white/10'}`} />}
              </div>
            ))}
            <div className="ml-2">
              <p className="text-white text-sm font-medium">{step === 1 ? 'Şirket Bilgileri' : 'Hesap Bilgileri'}</p>
              <p className="text-gray-600 text-xs">Adım {step} / 2</p>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{step === 1 ? 'Şirketinizi kurun' : 'Hesabınızı oluşturun'}</h2>
          <p className="text-gray-500 mb-8">{step === 1 ? 'Yönetim şirketinizin bilgilerini girin' : 'Giriş yapacağınız hesap bilgileri'}</p>
          {step === 1 ? (
            <form onSubmit={(e) => { e.preventDefault(); setStep(2) }} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Şirket Adı *</label>
                <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="ABC Site Yönetim A.Ş." required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Telefon</label>
                <input type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="0532 123 45 67" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Şehir</label>
                <input type="text" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} placeholder="İstanbul" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <button type="submit" disabled={!companyName} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 mt-2">Devam Et</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Ad Soyad *</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ahmet Yılmaz" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">E-posta *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Şifre *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="En az 6 karakter" required minLength={6} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">{error}</div>}
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 rounded-xl transition-all duration-200 border border-white/10">Geri</button>
                <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Oluşturuluyor...</> : 'Hesap Oluştur'}
                </button>
              </div>
            </form>
          )}
          <p className="text-center text-gray-600 text-sm mt-6">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">Giriş yapın</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
