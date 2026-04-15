'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { formatCurrency } from '@/lib/utils'
import { Building2, CreditCard, Users, TrendingDown, AlertCircle, Home, DollarSign, Clock } from 'lucide-react'

export default function DashboardPage() {
  const { activeSite } = useSite()
  const [stats, setStats] = useState({ 
    totalResidents: 0, 
    totalUnits: 0,
    pendingDues: 0, 
    overdueAmount: 0, 
    monthlyExpenses: 0,
    totalCollected: 0
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeSite) {
      setLoading(false)
      return
    }
    
    async function load() {
      const supabase = createClient()
      setLoading(true)
      
      try {
        const [residents, units, dues, expenses, recentPayments] = await Promise.all([
          supabase.from('residents').select('id', { count: 'exact', head: false }).eq('site_id', activeSite!.id).eq('is_active', true),
          supabase.from('units').select('id', { count: 'exact', head: false }).eq('site_id', activeSite!.id),
          supabase.from('dues').select('amount, status').eq('site_id', activeSite!.id).in('status', ['pending', 'overdue']),
          supabase.from('expenses').select('amount').eq('site_id', activeSite!.id).gte('expense_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]),
          supabase.from('dues').select('amount, paid_at, residents(full_name)').eq('site_id', activeSite!.id).eq('status', 'paid').order('paid_at', { ascending: false }).limit(5)
        ])
        
        const { data: paidDues } = await supabase
          .from('dues')
          .select('amount')
          .eq('site_id', activeSite!.id)
          .eq('status', 'paid')
          .gte('paid_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
        
        const overdueAmount = dues.data?.filter(d => d.status === 'overdue').reduce((s, d) => s + d.amount, 0) ?? 0
        const monthlyExpenses = expenses.data?.reduce((s, e) => s + e.amount, 0) ?? 0
        const totalCollected = paidDues?.reduce((s, d) => s + d.amount, 0) ?? 0
        
        setStats({ 
          totalResidents: residents.count ?? 0, 
          totalUnits: units.count ?? 0,
          pendingDues: dues.data?.length ?? 0, 
          overdueAmount, 
          monthlyExpenses,
          totalCollected
        })
        
        setRecentActivities(recentPayments.data || [])
      } catch (error) {
        console.error('Dashboard yüklenirken hata:', error)
      }
      setLoading(false)
    }
    
    load()
  }, [activeSite])

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-4">
          <Building2 className="w-10 h-10 text-indigo-400" />
        </div>
        <h2 className="text-white text-2xl font-semibold mb-2">Hoş Geldiniz!</h2>
        <p className="text-gray-500 mb-6">Başlamak için lütfen bir site seçin veya yeni site ekleyin</p>
      </div>
    )
  }

  const cards = [
    { label: 'Toplam Daire', value: stats.totalUnits.toString(), icon: Home, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Aktif Sakin', value: stats.totalResidents.toString(), icon: Users, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Bekleyen Aidat', value: stats.pendingDues.toString(), icon: CreditCard, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Bu Ay Tahsilat', value: formatCurrency(stats.totalCollected), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Gecikmiş Tutar', value: formatCurrency(stats.overdueAmount), icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Bu Ay Gider', value: formatCurrency(stats.monthlyExpenses), icon: TrendingDown, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-white text-3xl font-bold">Dashboard</h2>
        <p className="text-gray-500 mt-1">{activeSite?.name} sitesine ait özet bilgiler</p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#13161f] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500 text-sm font-medium">{card.label}</span>
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
            <div className="text-white text-2xl font-bold">{loading ? '...' : card.value}</div>
          </div>
        ))}
      </div>

      {/* Son Ödemeler */}
      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-indigo-400" />
          <h3 className="text-white font-semibold">Son Ödemeler</h3>
        </div>
        {recentActivities.length === 0 ? (
          <p className="text-gray-500 text-sm">Henüz ödeme yapılmamış</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-white text-sm">{activity.residents?.full_name}</p>
                  <p className="text-gray-500 text-xs">{new Date(activity.paid_at).toLocaleDateString('tr-TR')}</p>
                </div>
                <p className="text-green-400 font-medium">{formatCurrency(activity.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
