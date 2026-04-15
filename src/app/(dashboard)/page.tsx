'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from './layout'
import { formatCurrency } from '@/lib/utils'
import { CreditCard, Users, TrendingDown, AlertCircle } from 'lucide-react'

interface DashboardStats {
  totalResidents: number
  pendingDues: number
  overdueAmount: number
  monthlyExpenses: number
}

export default function DashboardPage() {
  const { activeSite } = useSite()
  const [stats, setStats] = useState<DashboardStats>({ totalResidents: 0, pendingDues: 0, overdueAmount: 0, monthlyExpenses: 0 })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeSite) return
    const siteId = activeSite.id

    async function load() {
      const supabase = createClient()
      setLoading(true)
      const [residents, dues, expenses] = await Promise.all([
        supabase.from('residents').select('id', { count: 'exact' }).eq('site_id', siteId).eq('is_active', true),
        supabase.from('dues').select('amount, status').eq('site_id', siteId).in('status', ['pending', 'overdue']),
        supabase.from('expenses').select('amount').eq('site_id', siteId).gte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
      ])
      const overdueAmount = dues.data?.filter(d => d.status === 'overdue').reduce((s, d) => s + d.amount, 0) ?? 0
      const monthlyExpenses = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0
      setStats({ totalResidents: residents.count ?? 0, pendingDues: dues.data?.length ?? 0, overdueAmount, monthlyExpenses })
      setLoading(false)
    }
    void load()
  }, [activeSite])

  const cards = [
    { label: 'Aktif Sakin', value: stats.totalResidents.toString(), icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Bekleyen Aidat', value: stats.pendingDues.toString(), icon: CreditCard, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Gecikmiş Tutar', value: formatCurrency(stats.overdueAmount), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Bu Ay Gider', value: formatCurrency(stats.monthlyExpenses), icon: TrendingDown, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-500 text-sm mt-1">{activeSite?.name}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm">{card.label}</span>
              <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-white text-2xl font-bold">{loading ? '...' : card.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
