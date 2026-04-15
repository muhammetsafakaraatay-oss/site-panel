'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingDown, Plus, X, Loader2, Loader, PieChart } from 'lucide-react'
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const CATEGORIES: Record<string, string> = { 
  cleaning: 'Temizlik', 
  security: 'Güvenlik', 
  maintenance: 'Bakım/Onarım', 
  elevator: 'Asansör', 
  electricity: 'Elektrik', 
  water: 'Su', 
  insurance: 'Sigorta', 
  tax: 'Vergi', 
  other: 'Diğer' 
}

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: '#3b82f6',
  security: '#ef4444',
  maintenance: '#f59e0b',
  elevator: '#8b5cf6',
  electricity: '#10b981',
  water: '#06b6d4',
  insurance: '#ec4899',
  tax: '#6b7280',
  other: '#9ca3af'
}

interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  vendor: string | null
}

export default function ExpensesPage() {
  const { activeSite } = useSite()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [form, setForm] = useState({ description: '', amount: '', category: 'other', expense_date: new Date().toISOString().split('T')[0], vendor: '' })

  function setField(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  const load = useCallback(async () => {
    if (!activeSite) return
    const supabase = createClient()
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*').eq('site_id', activeSite.id).order('expense_date', { ascending: false })
    setExpenses((data ?? []) as Expense[])
    
    // Kategori bazlı toplamlar
    const categoryTotals: Record<string, number> = {}
    data?.forEach(exp => {
      categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount
    })
    
    const chartData = Object.entries(categoryTotals).map(([cat, total]) => ({
      name: CATEGORIES[cat] || cat,
      value: total,
      category: cat
    }))
    setCategoryData(chartData)
    
    setLoading(false)
  }, [activeSite])

  useEffect(() => {
    if (!activeSite) return
    load()
  }, [activeSite, load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSite) return
    const supabase = createClient()
    setSaving(true)
    await supabase.from('expenses').insert({ 
      site_id: activeSite.id, 
      description: form.description, 
      amount: parseFloat(form.amount), 
      category: form.category, 
      expense_date: form.expense_date, 
      vendor: form.vendor || null 
    })
    setForm({ description: '', amount: '', category: 'other', expense_date: new Date().toISOString().split('T')[0], vendor: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <TrendingDown className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Giderler</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-white text-2xl font-bold">Giderler</h2>
          <p className="text-gray-500 text-sm mt-1">Toplam: {formatCurrency(total)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowChart(!showChart)} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm px-4 py-2.5 rounded-xl">
            <PieChart className="w-4 h-4" />
            {showChart ? 'Liste Görünümü' : 'Grafik Görünümü'}
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl">
            <Plus className="w-4 h-4" />Gider Ekle
          </button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Yeni Gider</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <select value={form.category} onChange={e => setField('category', e.target.value)} className="w-full bg-[#1a1f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white">
                {Object.entries(CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Açıklama" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="number" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="Tutar" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input type="date" value={form.expense_date} onChange={e => setField('expense_date', e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <input value={form.vendor} onChange={e => setField('vendor', e.target.value)} placeholder="Tedarikçi" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-white/5 text-gray-300 py-2.5 rounded-xl">İptal</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader className="w-6 h-6 text-indigo-400 animate-spin" /></div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <TrendingDown className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-500">Henüz gider eklenmedi</p>
        </div>
      ) : showChart && categoryData.length > 0 ? (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4">Kategorilere Göre Gider Dağılımı</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RePieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (%${(percent * 100).toFixed(0)})`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs text-gray-600">Kategori</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Açıklama</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Tedarikçi</th>
                <th className="text-left px-5 py-3 text-xs text-gray-600">Tarih</th>
                <th className="text-right px-5 py-3 text-xs text-gray-600">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                  <td className="px-5 py-3.5"><span className="text-xs bg-white/5 text-gray-400 px-2.5 py-1 rounded-full">{CATEGORIES[exp.category]}</span></td>
                  <td className="px-5 py-3.5 text-white text-sm">{exp.description}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-sm">{exp.vendor ?? '-'}</td>
                  <td className="px-5 py-3.5 text-gray-500 text-sm">{formatDate(exp.expense_date)}</td>
                  <td className="px-5 py-3.5 text-white text-sm font-medium text-right">{formatCurrency(exp.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
