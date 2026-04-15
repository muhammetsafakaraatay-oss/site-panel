'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { formatCurrency, formatDate } from '@/lib/utils'
import { FileText, Download, Calendar, TrendingUp, TrendingDown, Printer, FileSpreadsheet, File } from 'lucide-react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const { activeSite } = useSite()
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState('dues')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    collectedDues: 0,
    pendingDues: 0,
    overdueDues: 0
  })

  useEffect(() => {
    if (activeSite) {
      loadSummary()
    }
  }, [activeSite, startDate, endDate])

  async function loadSummary() {
    if (!activeSite) return
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: paidDues } = await supabase
        .from('dues')
        .select('amount')
        .eq('site_id', activeSite.id)
        .eq('status', 'paid')
        .gte('paid_at', startDate)
        .lte('paid_at', endDate)

      const { data: pendingDues } = await supabase
        .from('dues')
        .select('amount')
        .eq('site_id', activeSite.id)
        .eq('status', 'pending')

      const { data: overdueDues } = await supabase
        .from('dues')
        .select('amount')
        .eq('site_id', activeSite.id)
        .eq('status', 'overdue')

      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('site_id', activeSite.id)
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)

      const totalIncome = paidDues?.reduce((s, d) => s + d.amount, 0) || 0
      const totalExpense = expenses?.reduce((s, e) => s + e.amount, 0) || 0
      const collectedDues = paidDues?.length || 0
      const pendingDuesCount = pendingDues?.length || 0
      const overdueDuesAmount = overdueDues?.reduce((s, d) => s + d.amount, 0) || 0

      setSummary({
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        collectedDues,
        pendingDues: pendingDuesCount,
        overdueDues: overdueDuesAmount
      })
    } catch (error) {
      console.error('Rapor yüklenirken hata:', error)
    }
    setLoading(false)
  }

  async function exportToExcel() {
    if (!activeSite) return
    setLoading(true)
    const supabase = createClient()

    try {
      let data = []
      
      if (reportType === 'dues') {
        const { data: dues } = await supabase
          .from('dues')
          .select(`
            period,
            title,
            amount,
            status,
            due_date,
            paid_at,
            residents (full_name),
            units (unit_no, blocks (name))
          `)
          .eq('site_id', activeSite.id)

        data = dues?.map(d => ({
          'Dönem': d.period,
          'Aidat Adı': d.title,
          'Tutar': d.amount,
          'Durum': d.status === 'paid' ? 'Ödendi' : d.status === 'pending' ? 'Bekliyor' : 'Gecikmiş',
          'Son Tarih': d.due_date,
          'Ödeme Tarihi': d.paid_at || '-',
          'Sakin': d.residents?.full_name || '-',
          'Daire': d.units?.unit_no || '-'
        })) || []
      } else {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('site_id', activeSite.id)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)

        data = expenses?.map(e => ({
          'Kategori': e.category,
          'Açıklama': e.description,
          'Tutar': e.amount,
          'Tarih': e.expense_date,
          'Tedarikçi': e.vendor || '-'
        })) || []
      }

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rapor')
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/octet-stream' })
      saveAs(blob, `${activeSite.name}_${reportType}_raporu.xlsx`)
    } catch (error) {
      console.error('Excel export hatası:', error)
      alert('Excel export edilirken hata oluştu')
    }
    setLoading(false)
  }

  async function exportToPDF() {
    if (!activeSite) return
    setLoading(true)
    const supabase = createClient()
    const doc = new jsPDF()

    try {
      let data = []
      let headers = []
      
      if (reportType === 'dues') {
        const { data: dues } = await supabase
          .from('dues')
          .select(`
            period,
            title,
            amount,
            status,
            due_date,
            residents (full_name),
            units (unit_no)
          `)
          .eq('site_id', activeSite.id)

        data = dues?.map(d => [
          d.period,
          d.title,
          formatCurrency(d.amount),
          d.status === 'paid' ? 'Ödendi' : d.status === 'pending' ? 'Bekliyor' : 'Gecikmiş',
          d.due_date,
          d.residents?.full_name || '-',
          d.units?.unit_no || '-'
        ]) || []
        
        headers = ['Dönem', 'Aidat Adı', 'Tutar', 'Durum', 'Son Tarih', 'Sakin', 'Daire']
      } else {
        const { data: expenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('site_id', activeSite.id)
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)

        data = expenses?.map(e => [
          e.category,
          e.description,
          formatCurrency(e.amount),
          e.expense_date,
          e.vendor || '-'
        ]) || []
        
        headers = ['Kategori', 'Açıklama', 'Tutar', 'Tarih', 'Tedarikçi']
      }

      // Başlık
      doc.setFontSize(18)
      doc.text(`${activeSite.name} - ${reportType === 'dues' ? 'Aidat Raporu' : 'Gider Raporu'}`, 14, 20)
      doc.setFontSize(10)
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 30)
      doc.text(`Dönem: ${formatDate(startDate)} - ${formatDate(endDate)}`, 14, 37)

      // Tablo
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 45,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] }
      })

      doc.save(`${activeSite.name}_${reportType}_raporu.pdf`)
    } catch (error) {
      console.error('PDF export hatası:', error)
      alert('PDF export edilirken hata oluştu')
    }
    setLoading(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <FileText className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Raporlama</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  const cards = [
    { label: 'Toplam Tahsilat', value: formatCurrency(summary.totalIncome), icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Toplam Gider', value: formatCurrency(summary.totalExpense), icon: TrendingDown, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Net Kar/Zarar', value: formatCurrency(summary.netProfit), icon: FileText, color: summary.netProfit >= 0 ? 'text-green-400' : 'text-red-400', bg: 'bg-blue-500/10' },
    { label: 'Tahsil Edilen', value: `${summary.collectedDues} aidat`, icon: Calendar, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Bekleyen Aidat', value: `${summary.pendingDues} adet`, icon: FileText, color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { label: 'Gecikmiş Tutar', value: formatCurrency(summary.overdueDues), icon: FileText, color: 'text-red-400', bg: 'bg-red-500/10' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">Raporlama</h2>
        <p className="text-gray-500 mt-1">Finansal raporlar ve dökümler</p>
      </div>

      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Rapor Tipi</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white">
              <option value="dues">Aidat Raporu</option>
              <option value="expenses">Gider Raporu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Başlangıç Tarihi</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Bitiş Tarihi</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-500 text-sm">{card.label}</span>
              <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-white text-xl font-bold">{loading ? '...' : card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button onClick={exportToExcel} disabled={loading} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl">
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </button>
        <button onClick={exportToPDF} disabled={loading} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl">
          <File className="w-4 h-4" />
          PDF
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 px-5 py-2.5 rounded-xl">
          <Printer className="w-4 h-4" />
          Yazdır
        </button>
      </div>
    </div>
  )
}
