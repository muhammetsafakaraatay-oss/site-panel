'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewSitePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', address: '', city: '' })

  function setField(field: string, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    async function getCompanyId() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Profil hatası:', error)
        setError('Profil bilgileri alınamadı. Lütfen çıkış yapıp tekrar giriş yapın.')
        return
      }

      if (!profile?.company_id) {
        setError('Şirket bilgisi bulunamadı. Lütfen önce şirket kaydı yapın.')
        return
      }

      setCompanyId(profile.company_id)
    }

    getCompanyId()
  }, [supabase, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) {
      setError('Şirket bilgisi bulunamadı.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error: insertError } = await supabase.from('sites').insert({
        company_id: companyId,
        name: form.name,
        address: form.address || null,
        city: form.city || null,
      })

      if (insertError) {
        console.error('Site ekleme hatası:', insertError)
        setError(insertError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Beklenmeyen hata:', err)
      setError('Beklenmeyen bir hata oluştu.')
      setLoading(false)
    }
  }

  if (!companyId && !error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white text-2xl font-bold">Yeni Site Ekle</h2>
            <p className="text-gray-500 text-sm">Site bilgilerini girin</p>
          </div>
        </div>
      </div>

      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Site Adı *</label>
            <input
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Örn: Mavi Bahçe Sitesi"
              required
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Adres</label>
            <input
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="Mahalle, sokak, no"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Şehir</label>
            <input
              value={form.city}
              onChange={(e) => setField('city', e.target.value)}
              placeholder="İstanbul"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 rounded-xl transition-all border border-white/10"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !form.name}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Oluşturuluyor...
                </>
              ) : (
                'Site Oluştur'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
