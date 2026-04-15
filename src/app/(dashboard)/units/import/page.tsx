'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../../layout'
import { useToast } from '@/components/ui/Toast'
import { Upload, Download, CheckCircle2, Loader2, Building2, Home } from 'lucide-react'
import * as XLSX from 'xlsx'

type UnitImportRow = Record<string, string | number | null | undefined>

function getRowValue(row: UnitImportRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value != null && value !== '') {
      return String(value)
    }
  }

  return ''
}

export default function ImportUnitsPage() {
  const { activeSite } = useSite()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<UnitImportRow[]>([])

  // Örnek Excel indir
  const downloadTemplate = () => {
    const template = [
      { block_name: 'A Blok', unit_no: '1' },
      { block_name: 'A Blok', unit_no: '2' },
      { block_name: 'B Blok', unit_no: '1' },
      { block_name: 'B Blok', unit_no: '10' },
    ]
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Daireler')
    XLSX.writeFile(wb, 'daire_template.xlsx')
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
      const rows = XLSX.utils.sheet_to_json<UnitImportRow>(sheet)

      setPreview(rows)
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const importUnits = async () => {
    if (!activeSite || preview.length === 0) return
    
    setLoading(true)
    const supabase = createClient()
    
    // Blokları grupla
    const blockMap = new Map()
    
    for (const item of preview) {
      const blockName = getRowValue(item, 'block_name', 'Blok', 'block')
      const unitNo = getRowValue(item, 'unit_no', 'Daire No')
      
      if (!blockName || !unitNo) continue
      
      // Blok kontrolü
      if (!blockMap.has(blockName)) {
        const { data: existingBlock } = await supabase
          .from('blocks')
          .select('id')
          .eq('site_id', activeSite.id)
          .eq('name', blockName)
          .single()
        
        if (existingBlock) {
          blockMap.set(blockName, existingBlock.id)
        } else {
          const { data: newBlock } = await supabase
            .from('blocks')
            .insert({ site_id: activeSite.id, name: blockName })
            .select()
            .single()
          
          if (newBlock) {
            blockMap.set(blockName, newBlock.id)
          }
        }
      }
    }
    
    // Daireleri ekle
    let success = 0
    let fail = 0
    
    for (const item of preview) {
      const blockName = getRowValue(item, 'block_name', 'Blok', 'block')
      const unitNo = getRowValue(item, 'unit_no', 'Daire No')
      
      if (!blockName || !unitNo) continue
      
      const blockId = blockMap.get(blockName)
      
      if (blockId) {
        const { error } = await supabase
          .from('units')
          .insert({
            site_id: activeSite.id,
            block_id: blockId,
            unit_no: unitNo.toString(),
            is_occupied: false
          })
        
        if (error) fail++
        else success++
      }
    }
    
    showToast('success', `${success} daire eklendi, ${fail} hata oluştu`)
    setPreview([])
    setLoading(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Building2 className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Toplu Daire Ekleme</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white text-2xl font-bold">Toplu Daire Ekleme</h2>
          <p className="text-gray-500 mt-1">Excel ile toplu daire ekleyin</p>
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
              <p className="text-gray-500 text-sm mt-1">Blok ve daire bilgilerini içeren Excel dosyası</p>
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
              <Home className="w-5 h-5 text-indigo-400" />
              Önizleme ({preview.length} daire)
            </h3>
            <button onClick={importUnits} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              İçe Aktar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-gray-500 text-sm">Blok</th>
                  <th className="text-left py-2 text-gray-500 text-sm">Daire No</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((item, idx) => (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-2 text-white">{getRowValue(item, 'block_name', 'Blok', 'block')}</td>
                    <td className="py-2 text-white">{getRowValue(item, 'unit_no', 'Daire No')}</td>
                  </tr>
                ))}
                {preview.length > 10 && (
                  <tr>
                    <td colSpan={2} className="py-2 text-gray-500 text-center">+ {preview.length - 10} daire daha</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
