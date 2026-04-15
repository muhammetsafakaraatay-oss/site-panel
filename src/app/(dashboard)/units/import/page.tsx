'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../../layout'
import { useToast } from '@/components/ui/Toast'
import { Upload, Download, CheckCircle2, Loader2, Building2 } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function ImportUnitsPage() {
  const { activeSite } = useSite()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])

  const downloadTemplate = () => {
    const template = [{ block_name: 'A Blok', unit_no: '1' }, { block_name: 'A Blok', unit_no: '2' }]
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
      const rows = XLSX.utils.sheet_to_json(sheet)
      setPreview(rows)
      setLoading(false)
    }
    reader.readAsArrayBuffer(file)
  }

  const importUnits = async () => {
    if (!activeSite || preview.length === 0) return
    setLoading(true)
    const supabase = createClient()
    let success = 0, fail = 0

    for (const item of preview) {
      const blockName = item.block_name || item['Blok']
      const unitNo = item.unit_no || item['Daire No']
      if (!blockName || !unitNo) { fail++; continue }

      let blockId
      const { data: existing } = await supabase.from('blocks').select('id').eq('site_id', activeSite.id).eq('name', blockName).single()
      if (existing) blockId = existing.id
      else {
        const { data: newBlock } = await supabase.from('blocks').insert({ site_id: activeSite.id, name: blockName }).select().single()
        if (newBlock) blockId = newBlock.id
      }

      if (blockId) {
        const { error } = await supabase.from('units').insert({ site_id: activeSite.id, block_id: blockId, unit_no: unitNo.toString(), is_occupied: false })
        if (error) fail++
        else success++
      }
    }
    showToast('success', `${success} daire eklendi, ${fail} hata`)
    setPreview([])
    setLoading(false)
  }

  if (!activeSite) return <div className="flex flex-col items-center justify-center h-full"><Building2 className="w-16 h-16 text-gray-700" /><p>Lütfen bir site seçin</p></div>

  return (
    <div>
      <div className="flex justify-between mb-8"><div><h2 className="text-white text-2xl font-bold">Toplu Daire Ekleme</h2></div><button onClick={downloadTemplate} className="bg-indigo-600 text-white px-4 py-2 rounded-xl"><Download className="w-4 h-4 inline mr-2" />Şablon İndir</button></div>
      <div className="bg-[#13161f] border border-white/5 rounded-2xl p-6">
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer"><Upload className="w-12 h-12 text-gray-500 mx-auto" /><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg mt-3">Dosya Seç</button></label>
        </div>
      </div>
      {loading && <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>}
      {preview.length > 0 && <div className="mt-6 p-4 bg-[#13161f] rounded-2xl"><button onClick={importUnits} className="bg-green-600 text-white px-4 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4 inline mr-2" />İçe Aktar</button><pre className="mt-4 text-white">{JSON.stringify(preview, null, 2)}</pre></div>}
    </div>
  )
}
