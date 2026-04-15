'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { Send, CheckCircle2, AlertCircle, Loader2, CreditCard } from 'lucide-react'

interface PaymentDue {
  id: string
  amount: number
  due_date: string
  title: string
  period: string
  residents: { full_name: string | null } | { full_name: string | null }[] | null
}

function getPaymentResident(
  residents: PaymentDue['residents'],
) {
  if (Array.isArray(residents)) {
    return residents[0] ?? null
  }

  return residents
}

export default function PaymentNotificationPage() {
  const { activeSite } = useSite()
  const [dues, setDues] = useState<PaymentDue[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedDue, setSelectedDue] = useState<PaymentDue | null>(null)
  const [form, setForm] = useState({ paymentDate: '', notes: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadUnpaidDues = useCallback(async () => {
    if (!activeSite) return

    const supabase = createClient()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('dues')
      .select(`
        id,
        amount,
        due_date,
        title,
        period,
        residents!inner(full_name)
      `)
      .eq('status', 'pending')
      .eq('residents.id', user.id)
      .order('due_date')
    
    setDues((data ?? []) as unknown as PaymentDue[])
    setLoading(false)
  }, [activeSite])

  useEffect(() => {
    if (!activeSite) return

    async function loadInitialUnpaidDues() {
      const supabase = createClient()
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data } = await supabase
        .from('dues')
        .select(`
          id,
          amount,
          due_date,
          title,
          period,
          residents!inner(full_name)
        `)
        .eq('status', 'pending')
        .eq('residents.id', user.id)
        .order('due_date')

      setDues((data ?? []) as unknown as PaymentDue[])
      setLoading(false)
    }

    void loadInitialUnpaidDues()
  }, [activeSite])

  async function sendNotification(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDue) return
    
    setSending(true)
    setError('')
    setMessage('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/notifications/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dueId: selectedDue.id,
        residentId: user?.id,
        amount: selectedDue.amount,
        paymentDate: form.paymentDate,
        notes: form.notes
      })
    })

    const data = await res.json()

    if (data.success) {
      setMessage('Ödeme bildiriminiz gönderildi! Yönetici onayı bekleniyor.')
      setForm({ paymentDate: '', notes: '' })
      setSelectedDue(null)
      await loadUnpaidDues()
    } else {
      setError(data.error || 'Bir hata oluştu')
    }
    setSending(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <CreditCard className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Ödeme Bildirimi</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">Ödeme Bildirimi</h2>
        <p className="text-gray-500 mt-1">Havale/EFT yaptıysanız bildirin</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : dues.length === 0 ? (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-500">Ödenmemiş aidatınız bulunmuyor</p>
        </div>
      ) : !selectedDue ? (
        <div className="space-y-3">
          <h3 className="text-white font-semibold mb-3">Ödenmemiş Aidatlarınız</h3>
          {dues.map(due => (
            <div key={due.id} className="bg-[#13161f] border border-white/10 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{due.title}</p>
                <p className="text-gray-500 text-sm">{due.period} - Son Tarih: {due.due_date}</p>
                <p className="text-gray-500 text-xs">{getPaymentResident(due.residents)?.full_name}</p>
                <p className="text-indigo-400 font-semibold">{due.amount} TL</p>
              </div>
              <button onClick={() => setSelectedDue(due)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
                Bildirim Yap
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Ödeme Bildirimi</h3>
            <button onClick={() => setSelectedDue(null)} className="text-gray-500 hover:text-white">Geri</button>
          </div>
          <div className="mb-4 p-3 bg-white/5 rounded-xl">
            <p className="text-gray-400 text-sm">Aidat: {selectedDue.title}</p>
            <p className="text-indigo-400 font-semibold">{selectedDue.amount} TL</p>
          </div>
          <form onSubmit={sendNotification} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Ödeme Tarihi</label>
              <input type="date" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Açıklama (Dekont No vs.)</label>
              <textarea rows={3} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="İşlem yaptığınız banka, dekont numarası..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
            </div>
            {message && <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-green-400 text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{message}</div>}
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</div>}
            <button type="submit" disabled={sending} className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-3 rounded-xl flex items-center justify-center gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Bildirim Gönder
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
