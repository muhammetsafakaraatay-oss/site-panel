'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { useToast } from '@/components/ui/Toast'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Building2 } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function BankImportPage() {
  const { activeSite } = useSite()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [matched, setMatched] = useState<any[]>([])
  const [unmatched, setUnmatched] = useState<any[]>([])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)
      
      // Banka hareketlerini analiz et
      const transactions = rows.map((row: any) => ({
        date: row['Tarih'] || row['İşlem Tarihi'] || '',
        description: row['Açıklama'] || row['İşlem Açıklaması'] || '',
        amount: parseFloat(row['Tutar']?.toString().replace(/\./g, '').replace(',', '.') || '0'),
        sender: row['Gönderen'] || row['Alıcı'] || '',
        reference: row['Referans'] || row['Dekont No'] || ''
      }))

      await matchTransactions(transactions)
    }
    reader.readAsArrayBuffer(file)
  }

  async function matchTransactions(transactions: any[]) {
    const supabase = createClient()
    
    // Tüm bekleyen aidatları al
    const { data: pendingDues } = await supabase
      .from('dues')
      .select(`
        id,
        amount,
        period,
        title,
        residents (id, full_name, phone),
        units (unit_no)
      `)
      .eq('site_id', activeSite?.id)
      .eq('status', 'pending')

    const matchedList: any[] = []
    const unmatchedList: any[] = []

    for (const transaction of transactions) {
      // Açıklamadan daire no veya isim ara
      let matchedDue = null
      
      for (const due of pendingDues || []) {
        const unitNo = due.units?.unit_no?.toString()
        const residentName = due.residents?.full_name?.toLowerCase()
        const description = transaction.description?.toLowerCase()
        
        if (
          (unitNo && description?.includes(unitNo)) ||
          (residentName && description?.includes(residentName)) ||
          (transaction.amount === due.amount && Math.abs(transaction.amount - due.amount) < 0.01)
        ) {
          matchedDue = due
          break
        }
      }

      if (matchedDue) {
        matchedList.push({
          ...transaction,
          due: matchedDue
        })
      } else {
        unmatchedList.push(transaction)
      }
    }

    setPreview(transactions)
    setMatched(matchedList)
    setUnmatched(unmatchedList)
    setLoading(false)
    
    showToast('info', `${matchedList.length} işlem eşleşti, ${unmatchedList.length} işlem eşleşmedi`)
  }

  async function confirmPayments() {
    if (!activeSite) return
    setLoading(true)
    
    const supabase = createClient()
    let successCount = 0
    
    for (const item of matched) {
      const { error } = await supabase
        .from('dues')
        .update({
          status: 'paid',
          paid_amount: item.amount,
          paid_at: new Date(item.date).toISOString(),
          payment_note: `Banka: ${item.description}`
        })
        .eq('id', item.due.id)
      
      if (!error) successCount++
    }
    
    showToast('success', `${successCount} aidat ödendi olarak işaretlendi`)
    setMatched([])
    setPreview([])
    setLoading(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Building2 className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Banka İçe Aktar</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">Banka Hareketlerini İçe Aktar</h2>
        <p className="text-gray-500 mt-1">Excel/CSV dosyası yükleyerek aidatları otomatik eşleştirin</p>
      </div>

      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <Upload className="w-12 h-12 text-gray-500" />
            <div>
              <p className="text-white font-medium">Excel/CSV Dosyası Seç</p>
              <p className="text-gray-500 text-sm mt-1">Bankanızdan indirdiğiniz hareket dosyasını yükleyin</p>
            </div>
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
              Dosya Seç
            </button>
          </label>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          <span className="ml-2 text-gray-400">İşleniyor...</span>
        </div>
      )}

      {matched.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Eşleşen İşlemler ({matched.length})
            </h3>
            <button
              onClick={confirmPayments}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              {matched.length} Aidatı Onayla
            </button>
          </div>
          <div className="space-y-2">
            {matched.map((item, idx) => (
              <div key={idx} className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">{item.due.residents?.full_name}</p>
                    <p className="text-gray-500 text-xs">Daire: {item.due.units?.unit_no} - {item.due.period}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-semibold">{item.amount} TL</p>
                    <p className="text-gray-500 text-xs">{item.date}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-1 truncate">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
            Eşleşmeyen İşlemler ({unmatched.length})
          </h3>
          <div className="space-y-2">
            {unmatched.map((item, idx) => (
              <div key={idx} className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm">{item.sender || 'Belirsiz'}</p>
                    <p className="text-gray-500 text-xs">{item.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-semibold">{item.amount} TL</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs mt-1">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
