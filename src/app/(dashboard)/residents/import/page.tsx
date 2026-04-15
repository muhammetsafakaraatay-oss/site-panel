'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../../layout'
import { useToast } from '@/components/ui/Toast'
import { Upload, Download, CheckCircle2, Loader2, Building2, Users } from 'lucide-react'
import * as XLSX from 'xlsx'

type ResidentImportRow = Record<string, string | number | null | undefined>

function getRowValue(row: ResidentImportRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value != null && value !== '') {
      return String(value)
    }
  }

  return ''
}

export default function ImportResidentsPage() {
  const { activeSite } = useSite()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<ResidentImportRow[]>([])

  // Örnek Excel indir
  const downloadTemplate = () => {
    const template = [
      { 
        full_name: 'Ahmet Yılmaz', 
        unit_no: '1', 
        block_name: 'A Blok',
        phone: '05321234567', 
        email: 'ahmet@example.com', 
        resident_type: 'owner' 
      },
      { 
        full_name: 'Mehmet Demir', 
        unit_no: '2', 
        block_name: 'A Blok',
        phone: '05321234568', 
        email: 'mehmet@example.com', 
        resident_type: 'tenant' 
      },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sakinler')
    XLSX.writeFile(wb, 'sakin_template.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    
    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<ResidentImportRow>(sheet)

      setPreview(rows)
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const importResidents = async () => {
    if (!activeSite || preview.length === 0) return
    
    setLoading(true)
    const supabase = createClient()
    
    let success = 0
    let fail = 0
    const errors = []

    for (const item of preview) {
      const fullName = getRowValue(item, 'full_name', 'Ad Soyad', 'isim')
      const unitNo = getRowValue(item, 'unit_no', 'Daire No')
      const blockName = getRowValue(item, 'block_name', 'Blok', 'block')
      const phone = getRowValue(item, 'phone', 'Telefon', 'tel')
      const email = getRowValue(item, 'email', 'E-posta', 'mail')
      const residentType = item.resident_type === 'tenant' ? 'tenant' : 'owner'

      if (!fullName || !unitNo) {
        fail++
        errors.push(`${fullName || 'İsimsiz'} - Eksik bilgi`)
        continue
      }

      // Daire ID'sini bul
      let unitId = null
      
      if (blockName) {
        const { data: foundUnit } = await supabase
          .from('units')
          .select('id')
          .eq('site_id', activeSite.id)
          .eq('unit_no', unitNo)
          .eq('blocks(name)', blockName)
          .single()
        
        if (foundUnit) {
          unitId = foundUnit.id
        }
      }
      
      if (!unitId) {
        const { data: foundUnit } = await supabase
          .from('units')
          .select('id')
          .eq('site_id', activeSite.id)
          .eq('unit_no', unitNo)
          .single()
        
        if (foundUnit) {
          unitId = foundUnit.id
        }
      }

      if (!unitId) {
        fail++
        errors.push(`${fullName} - Daire bulunamadı: ${blockName ? blockName + ' ' : ''}${unitNo}`)
        continue
      }

      // Sakin ekle
      const { error } = await supabase
        .from('residents')
        .insert({
          site_id: activeSite.id,
          unit_id: unitId,
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          resident_type: residentType,
          is_active: true
        })

      if (error) {
        fail++
        errors.push(`${fullName} - ${error.message}`)
      } else {
        success++
        // Daireyi dolu olarak işaretle
        await supabase.from('units').update({ is_occupied: true }).eq('id', unitId)
      }
    }

    showToast('success', `${success} sakin eklendi, ${fail} hata oluştu`)
    if (errors.length > 0 && errors.length <= 5) {
      errors.forEach(err => showToast('error', err))
    }
    setPreview([])
    setLoading(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Building2 className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Toplu Sakin Ekleme</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">Toplu Sakin Ekleme</h2>
          <p className="text-gray-500 mt-1">Excel ile toplu sakin ekleyin</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl">
          <Download className="w-4 h-4" />
          Şablon İndir
        </button>
      </div>

      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6 mb-6">
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
          />
          <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center gap-3">
            <Upload className="w-12 h-12 text-gray-500" />
            <div>
              <p className="text-white font-medium">Excel Dosyası Seç</p>
              <p className="text-gray-500 text-sm mt-1">Sakin bilgilerini içeren Excel dosyası</p>
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
        </div>
      )}

      {preview.length > 0 && (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Önizleme ({preview.length} sakin)
            </h3>
            <button onClick={importResidents} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              İçe Aktar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-500 text-sm">Ad Soyad</th>
                  <th className="text-left py-2 text-gray-500 text-sm">Blok</th>
                  <th className="text-left py-2 text-gray-500 text-sm">Daire No</th>
                  <th className="text-left py-2 text-gray-500 text-sm">Telefon</th>
                  <th className="text-left py-2 text-gray-500 text-sm">Tip</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-2 text-white">{getRowValue(item, 'full_name', 'Ad Soyad', 'isim')}</td>
                    <td className="py-2 text-white">{getRowValue(item, 'block_name', 'Blok', 'block')}</td>
                    <td className="py-2 text-white">{getRowValue(item, 'unit_no', 'Daire No')}</td>
                    <td className="py-2 text-white">{getRowValue(item, 'phone', 'Telefon', 'tel')}</td>
                    <td className="py-2 text-white">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${(item.resident_type === 'tenant' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400')}`}>
                        {item.resident_type === 'tenant' ? 'Kiracı' : 'Malik'}
                      </span>
                    </td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr><td colSpan={5} className="py-2 text-gray-500 text-center">+ {preview.length - 10} sakin daha</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
