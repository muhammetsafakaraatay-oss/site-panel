'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { useToast } from '@/components/ui/Toast'
import { formatCurrency, formatDate, getPeriod, formatPeriod } from '@/lib/utils'
import { CreditCard, Plus, X, Loader2, Loader, CheckCircle2, ChevronLeft, ChevronRight, Edit2, Trash2, Save } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = { 
  pending: 'bg-yellow-500/10 text-yellow-400', 
  paid: 'bg-green-500/10 text-green-400', 
  overdue: 'bg-red-500/10 text-red-400'
}

const STATUS_LABELS: Record<string, string> = { 
  pending: 'Bekliyor', 
  paid: 'Ödendi', 
  overdue: 'Gecikmiş'
}

interface Due {
  id: string
  amount: number
  due_date: string
  status: string
  title: string
  period: string
  residents?: { full_name: string | null; phone: string | null } | null
  units?: { unit_no: string | number; blocks: { name: string } | null } | null
}

function getBlockName(blocks: { name: string } | null) {
  return blocks?.name ?? ''
}

export default function DuesPage() {
  const { activeSite } = useSite()
  const { showToast } = useToast()
  const [dues, setDues] = useState<Due[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showDefForm, setShowDefForm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingDue, setEditingDue] = useState<Due | null>(null)
  const [saving, setSaving] = useState(false)
  const [period, setPeriod] = useState(getPeriod())
  const [filter, setFilter] = useState('all')
  const [defForm, setDefForm] = useState({ name: 'Aylık Aidat', amount: '', due_day: '1' })

  function setDef(field: string, value: string) { 
    setDefForm(f => ({ ...f, [field]: value })) 
  }

  function changePeriod(dir: number) {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + dir)
    setPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const load = useCallback(async () => {
    if (!activeSite) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    setLoading(true)
    
    let query = supabase
      .from('dues')
      .select(`
        id,
        amount,
        due_date,
        status,
        title,
        period,
        residents (full_name, phone),
        units (unit_no, blocks (name))
      `)
      .eq('site_id', activeSite.id)
      .eq('period', period)
    
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }
    
    const { data, error } = await query.order('created_at')
    
    if (error) {
      console.error('Dues yüklenirken hata:', error)
      setDues([])
    } else {
      setDues(data as unknown as Due[])
    }
    setLoading(false)
  }, [activeSite, filter, period])

  useEffect(() => {
    if (!activeSite) return
    const siteId = activeSite.id

    async function loadCurrentPeriodDues() {
      const supabase = createClient()
      setLoading(true)
      
      let query = supabase
        .from('dues')
        .select(`
          id,
          amount,
          due_date,
          status,
          title,
          period,
          residents (full_name, phone),
          units (unit_no, blocks (name))
        `)
        .eq('site_id', siteId)
        .eq('period', period)
      
      if (filter !== 'all') {
        query = query.eq('status', filter)
      }
      
      const { data, error } = await query.order('created_at')
      
      if (error) {
        console.error('Dues yüklenirken hata:', error)
        setDues([])
      } else {
        setDues(data as unknown as Due[])
      }
      setLoading(false)
    }

    void loadCurrentPeriodDues()
  }, [activeSite, filter, period])

  async function handleGenerate() {
    if (!activeSite) return
    setGenerating(true)
    try {
      const res = await fetch('/api/dues/generate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ siteId: activeSite.id, period }) 
      })
      const data = await res.json()
      if (data.error) {
        showToast('error', 'Aidat oluşturulurken hata oluştu: ' + data.error)
      } else {
        showToast('success', `${data.inserted} aidat başarıyla oluşturuldu`)
        load()
      }
    } catch {
      showToast('error', 'Aidat oluşturulurken bir hata oluştu')
    }
    setGenerating(false)
  }

  async function markPaid(dueId: string) {
    const supabase = createClient()
    const due = dues.find(d => d.id === dueId)
    if (!due) return
    
    const { error } = await supabase.from('dues').update({ 
      status: 'paid', 
      paid_amount: due.amount, 
      paid_at: new Date().toISOString() 
    }).eq('id', dueId)
    
    if (error) {
      showToast('error', 'Ödeme güncellenirken hata oluştu')
      return
    }
    showToast('success', 'Aidat ödendi olarak işaretlendi')
    load()
  }

  async function deleteDue(dueId: string) {
    if (!confirm('Bu aidat kaydını silmek istediğinize emin misiniz?')) return
    
    const supabase = createClient()
    const { error } = await supabase.from('dues').delete().eq('id', dueId)
    
    if (error) {
      showToast('error', 'Aidat silinirken hata oluştu')
      return
    }
    showToast('success', 'Aidat başarıyla silindi')
    load()
  }

  async function updateDue() {
    if (!editingDue) return
    
    const supabase = createClient()
    setSaving(true)
    
    const { error } = await supabase
      .from('dues')
      .update({ 
        amount: editingDue.amount,
        due_date: editingDue.due_date,
        title: editingDue.title
      })
      .eq('id', editingDue.id)
    
    if (error) {
      showToast('error', 'Aidat güncellenirken hata oluştu')
    } else {
      showToast('success', 'Aidat başarıyla güncellendi')
      load()
      setShowEditModal(false)
      setEditingDue(null)
    }
    setSaving(false)
  }

  async function handleSaveDef(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSite) return
    const supabase = createClient()
    setSaving(true)
    const { error } = await supabase.from('due_definitions').insert({ 
      site_id: activeSite.id, 
      name: defForm.name, 
      amount: parseFloat(defForm.amount), 
      due_day: parseInt(defForm.due_day), 
      frequency: 'monthly', 
      is_active: true 
    })
    
    if (error) {
      showToast('error', 'Aidat tanımı eklenirken hata oluştu')
    } else {
      showToast('success', 'Aidat tanımı eklendi')
      setDefForm({ name: 'Aylık Aidat', amount: '', due_day: '1' })
      setShowDefForm(false)
    }
    setSaving(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <CreditCard className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Aidat Takibi</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  const filtered = filter === 'all' ? dues : dues.filter(d => d.status === filter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Aidat Takibi</h2>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} kayıt</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowDefForm(true)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" />Aidat Tanımı
          </button>
          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm px-4 py-2.5 rounded-xl">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {formatPeriod(period)} Oluştur
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-[#13161f] border border-white/5 rounded-xl p-1">
          <button onClick={() => changePeriod(-1)} className="p-1.5 text-gray-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white text-sm font-medium px-2 min-w-32 text-center">{formatPeriod(period)}</span>
          <button onClick={() => changePeriod(1)} className="p-1.5 text-gray-400 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1">
          {['all','pending','overdue','paid'].map(s => (
            <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === s ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>
              {s === 'all' ? 'Tümü' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Aidat Tanımı Modal - kısa gösterim */}
      {showDefForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Aidat Tanımı</h3>
              <button onClick={() => setShowDefForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDef} className="space-y-3">
              <input value={defForm.name} onChange={e => setDef('name', e.target.value)} placeholder="Ad" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="number" value={defForm.amount} onChange={e => setDef('amount', e.target.value)} placeholder="Tutar" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="number" min="1" max="28" value={defForm.due_day} onChange={e => setDef('due_day', e.target.value)} placeholder="Son ödeme günü" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowDefForm(false)} className="flex-1 bg-white/5 text-gray-300 py-2.5 rounded-xl">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Düzenleme Modal */}
      {showEditModal && editingDue && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold">Aidat Düzenle</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <input value={editingDue.title} onChange={e => setEditingDue({...editingDue, title: e.target.value})} placeholder="Açıklama" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="number" value={editingDue.amount} onChange={e => setEditingDue({...editingDue, amount: parseFloat(e.target.value)})} placeholder="Tutar" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="date" value={editingDue.due_date} onChange={e => setEditingDue({...editingDue, due_date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEditModal(false)} className="flex-1 bg-white/5 text-gray-300 py-2.5 rounded-xl">İptal</button>
                <button onClick={updateDue} disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <CreditCard className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-500">Bu dönemde kayıt yok</p>
        </div>
      ) : (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-gray-600">Sakin</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Daire</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Açıklama</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Tutar</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Son Tarih</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Durum</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((due) => (
                <tr key={due.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-5 py-3.5 text-white text-sm">{due.residents?.full_name ?? '-'}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-sm">{getBlockName(due.units?.blocks ?? null)} - {due.units?.unit_no}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-sm">{due.title}</td>
                  <td className="px-5 py-3.5 text-white text-sm font-medium">{formatCurrency(due.amount)}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-sm">{formatDate(due.due_date)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[due.status]}`}>
                      {STATUS_LABELS[due.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {due.status !== 'paid' && (
                        <button onClick={() => markPaid(due.id)} className="text-green-400 hover:text-green-300" title="Ödendi">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => { setEditingDue(due); setShowEditModal(true) }} className="text-blue-400 hover:text-blue-300" title="Düzenle">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteDue(due.id)} className="text-red-400 hover:text-red-300" title="Sil">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
