'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { Building2, Copy, Check, Edit2, Save, X, Plus } from 'lucide-react'

interface BankAccount {
  id: string
  bank_name: string
  branch: string
  account_name: string
  account_number: string
  iban: string
  is_active: boolean
}

export default function BankingPage() {
  const { activeSite } = useSite()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [form, setForm] = useState({
    bank_name: '',
    branch: '',
    account_name: '',
    account_number: '',
    iban: ''
  })

  useEffect(() => {
    if (activeSite) {
      loadAccounts()
    }
  }, [activeSite])

  async function loadAccounts() {
    const supabase = createClient()
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('site_id', activeSite?.id)
      .order('created_at')
    
    setAccounts(data || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSite) return
    
    const supabase = createClient()
    
    if (editingId) {
      await supabase
        .from('bank_accounts')
        .update(form)
        .eq('id', editingId)
    } else {
      await supabase
        .from('bank_accounts')
        .insert({ ...form, site_id: activeSite.id, is_active: true })
    }
    
    setForm({ bank_name: '', branch: '', account_name: '', account_number: '', iban: '' })
    setShowForm(false)
    setEditingId(null)
    loadAccounts()
  }

  async function deleteAccount(id: string) {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return
    
    const supabase = createClient()
    await supabase.from('bank_accounts').delete().eq('id', id)
    loadAccounts()
  }

  function editAccount(account: BankAccount) {
    setForm({
      bank_name: account.bank_name,
      branch: account.branch,
      account_name: account.account_name,
      account_number: account.account_number,
      iban: account.iban
    })
    setEditingId(account.id)
    setShowForm(true)
  }

  async function copyToClipboard(text: string, id: string) {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Building2 className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Banka Hesapları</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">Banka Hesapları</h2>
          <p className="text-gray-500 mt-1">Aidat ödemeleri için banka hesap bilgileri</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm({ bank_name: '', branch: '', account_name: '', account_number: '', iban: '' }) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Hesap Ekle
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">{editingId ? 'Hesap Düzenle' : 'Yeni Hesap'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <input value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="Banka Adı *" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} placeholder="Şube" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} placeholder="Hesap Adı (Şirket Adı)" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} placeholder="Hesap No" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})} placeholder="IBAN" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white/5 text-gray-300 text-sm py-2.5 rounded-xl border border-white/10">İptal</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm py-2.5 rounded-xl">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Henüz banka hesabı eklenmedi</p>
          <p className="text-gray-600 text-sm mt-1">Sakinlerin aidat ödeyebilmesi için hesap bilgilerini ekleyin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {accounts.map(account => (
            <div key={account.id} className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-lg">{account.bank_name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => editAccount(account)} className="text-gray-500 hover:text-white transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteAccount(account.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {account.branch && <p className="text-gray-500 text-sm">Şube: {account.branch}</p>}
                <p className="text-gray-500 text-sm">Hesap Adı: {account.account_name}</p>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                  <p className="text-white text-sm font-mono">Hesap No: {account.account_number}</p>
                  <button onClick={() => copyToClipboard(account.account_number, `acc_${account.id}`)} className="text-gray-500 hover:text-white">
                    {copied === `acc_${account.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <p className="text-indigo-300 text-sm font-mono">IBAN: {account.iban}</p>
                  <button onClick={() => copyToClipboard(account.iban, `iban_${account.id}`)} className="text-gray-500 hover:text-white">
                    {copied === `iban_${account.id}` ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Banka bilgilerini gösteren kart */}
      {accounts.length > 0 && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-400 text-sm flex items-center gap-2">
            💡 İpucu: Bu banka bilgilerini WhatsApp üzerinden sakinlerinize gönderebilirsiniz.
          </p>
        </div>
      )}
    </div>
  )
}

import { Loader2 } from 'lucide-react'
