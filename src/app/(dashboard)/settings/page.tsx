'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Save, Loader2, Settings } from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [profileId, setProfileId] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [form, setForm] = useState({
    fullName: '',
    companyName: '',
    companyPhone: '',
    companyAddress: '',
  })

  function set(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, company_id')
        .eq('id', user.id)
        .single()

      if (!profile) {
        setLoading(false)
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id, name, phone, address')
        .eq('id', profile.company_id)
        .single()

      setProfileId(profile.id)
      setCompanyId(company?.id ?? null)
      setForm({
        fullName: profile.full_name ?? '',
        companyName: company?.name ?? '',
        companyPhone: company?.phone ?? '',
        companyAddress: company?.address ?? '',
      })
      setLoading(false)
    }

    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profileId || !companyId) return

    const supabase = createClient()
    setSaving(true)
    setMessage('')
    setError('')

    const [profileResult, companyResult] = await Promise.all([
      supabase.from('profiles').update({ full_name: form.fullName }).eq('id', profileId),
      supabase
        .from('companies')
        .update({
          name: form.companyName,
          phone: form.companyPhone || null,
          address: form.companyAddress || null,
        })
        .eq('id', companyId),
    ])

    if (profileResult.error || companyResult.error) {
      setError(profileResult.error?.message ?? companyResult.error?.message ?? 'Kaydedilemedi.')
      setSaving(false)
      return
    }

    setMessage('Ayarlar kaydedildi.')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
          <Settings className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold">Ayarlar</h2>
          <p className="text-gray-500 text-sm">Profil ve sirket bilgilerinizi yönetin</p>
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-[#13161f] border border-white/5 rounded-2xl p-6 space-y-4"
      >
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Ad Soyad</label>
          <input
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Sirket Adi</label>
          <input
            value={form.companyName}
            onChange={(e) => set('companyName', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Telefon</label>
          <input
            value={form.companyPhone}
            onChange={(e) => set('companyPhone', e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Adres</label>
          <textarea
            value={form.companyAddress}
            onChange={(e) => set('companyAddress', e.target.value)}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-3 rounded-xl transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Kaydet
        </button>
      </form>
    </div>
  )
}
