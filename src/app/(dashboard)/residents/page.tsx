'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { Users, Plus, Phone, Home, Loader2, Loader, X } from 'lucide-react'

interface ResidentUnit {
  unit_no: string | number
  blocks: { name: string } | { name: string }[] | null
}

interface Resident {
  id: string
  full_name: string
  resident_type: 'owner' | 'tenant'
  phone: string | null
  units: ResidentUnit | null
}

interface UnitOption {
  id: string
  unit_no: string | number
  block_id: string | null
  blocks: { name: string } | { name: string }[] | null
}

function getBlockName(blocks: ResidentUnit['blocks']) {
  if (Array.isArray(blocks)) return blocks[0]?.name ?? ''
  return blocks?.name ?? ''
}

export default function ResidentsPage() {
  const { activeSite } = useSite()
  const [residents, setResidents] = useState<Resident[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', resident_type: 'owner', unit_id: '' })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  const load = useCallback(async () => {
    if (!activeSite) return
    const supabase = createClient()
    setLoading(true)
    const { data } = await supabase.from('residents').select('*, units(unit_no, blocks(name))').eq('site_id', activeSite.id).eq('is_active', true).order('full_name')
    setResidents((data ?? []) as Resident[])
    const { data: u } = await supabase.from('units').select('id, unit_no, block_id, blocks(name)').eq('site_id', activeSite.id)
    setUnits((u ?? []) as UnitOption[])
    setLoading(false)
  }, [activeSite])

  useEffect(() => {
    if (!activeSite) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [activeSite, load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSite || !form.unit_id) return
    const supabase = createClient()
    setSaving(true)
    await supabase.from('residents').insert({ site_id: activeSite.id, unit_id: form.unit_id, full_name: form.full_name, phone: form.phone || null, email: form.email || null, resident_type: form.resident_type, is_active: true })
    await supabase.from('units').update({ is_occupied: true }).eq('id', form.unit_id)
    setForm({ full_name: '', phone: '', email: '', resident_type: 'owner', unit_id: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Sakinler</h2>
          <p className="text-gray-500 text-sm mt-1">{residents.length} aktif sakin</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all">
          <Plus className="w-4 h-4" />Sakin Ekle
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Yeni Sakin</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ad Soyad</label>
                <input value={form.full_name} onChange={e => set('full_name', e.target.value)} required placeholder="Ahmet Yılmaz" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Daire</label>
                <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)} required className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all">
                  <option value="">Daire seçin</option>
                  {units.map((u) => <option key={u.id} value={u.id}>{getBlockName(u.blocks)} - Daire {u.unit_no}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Telefon (WhatsApp)</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="905321234567" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">E-posta</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="ornek@mail.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tür</label>
                <select value={form.resident_type} onChange={e => set('resident_type', e.target.value)} className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all">
                  <option value="owner">Malik</option>
                  <option value="tenant">Kiracı</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium py-2.5 rounded-xl border border-white/10">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
                  {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Kaydediliyor...</> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : residents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Users className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-500">Henüz sakin eklenmedi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {residents.map((r) => (
            <div key={r.id} className="bg-[#13161f] border border-white/5 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-white font-medium">{r.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${r.resident_type === 'owner' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                    {r.resident_type === 'owner' ? 'Malik' : 'Kiracı'}
                  </span>
                </div>
              </div>
              {r.units && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                  <Home className="w-3.5 h-3.5" />
                  <span>{getBlockName(r.units.blocks) || '-'} - Daire {r.units.unit_no}</span>
                </div>
              )}
              {r.phone && (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{r.phone}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
