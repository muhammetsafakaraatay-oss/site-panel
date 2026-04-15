'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { Home, Loader, Loader2, Plus, X } from 'lucide-react'

interface Unit {
  id: string
  unit_no: string | number
  is_occupied: boolean
  blocks: { name: string } | { name: string }[] | null
}

interface Block {
  id: string
  name: string
}

function getBlockName(blocks: Unit['blocks']) {
  if (Array.isArray(blocks)) return blocks[0]?.name ?? ''
  return blocks?.name ?? ''
}

export default function UnitsPage() {
  const { activeSite } = useSite()
  const [units, setUnits] = useState<Unit[]>([])
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ blockName: '', unitNo: '' })

  function set(field: 'blockName' | 'unitNo', value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const load = useCallback(async () => {
    if (!activeSite) return
    const supabase = createClient()

    setLoading(true)
    const [{ data: unitsData }, { data: blockData }] = await Promise.all([
      supabase
        .from('units')
        .select('id, unit_no, is_occupied, blocks(name)')
        .eq('site_id', activeSite.id)
        .order('unit_no'),
      supabase.from('blocks').select('id, name').eq('site_id', activeSite.id).order('name'),
    ])

    setUnits((unitsData ?? []) as Unit[])
    setBlocks((blockData ?? []) as Block[])
    setLoading(false)
  }, [activeSite])

  useEffect(() => {
    if (!activeSite) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [activeSite, load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!activeSite) return

    const supabase = createClient()
    setSaving(true)
    setError('')

    let blockId = blocks.find(
      (block) => block.name.toLowerCase() === form.blockName.trim().toLowerCase()
    )?.id

    if (!blockId) {
      const { data: newBlock, error: blockError } = await supabase
        .from('blocks')
        .insert({ site_id: activeSite.id, name: form.blockName.trim() })
        .select('id, name')
        .single()

      if (blockError || !newBlock) {
        setError(blockError?.message ?? 'Blok oluşturulamadı.')
        setSaving(false)
        return
      }

      blockId = newBlock.id
      setBlocks((current) => [...current, newBlock])
    }

    const { error: unitError } = await supabase.from('units').insert({
      site_id: activeSite.id,
      block_id: blockId,
      unit_no: form.unitNo.trim(),
      is_occupied: false,
    })

    if (unitError) {
      setError(unitError.message)
      setSaving(false)
      return
    }

    setForm({ blockName: '', unitNo: '' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Daireler</h2>
          <p className="text-gray-500 text-sm mt-1">{units.length} kayıt</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Daire Ekle
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#13161f] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-semibold text-lg">Yeni Daire</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Blok</label>
                <input
                  list="block-options"
                  value={form.blockName}
                  onChange={(e) => set('blockName', e.target.value)}
                  required
                  placeholder="A Blok"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
                <datalist id="block-options">
                  {blocks.map((block) => (
                    <option key={block.id} value={block.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Daire No</label>
                <input
                  value={form.unitNo}
                  onChange={(e) => set('unitNo', e.target.value)}
                  required
                  placeholder="12"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-medium py-2.5 rounded-xl border border-white/10"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Kaydediliyor...
                    </>
                  ) : (
                    'Kaydet'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      ) : units.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <Home className="w-10 h-10 text-gray-700 mb-3" />
          <p className="text-gray-500">Henüz daire eklenmedi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {units.map((unit) => (
            <div
              key={unit.id}
              className="bg-[#13161f] border border-white/5 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">{getBlockName(unit.blocks) || 'Blok yok'}</p>
                  <h3 className="text-white text-xl font-semibold mt-1">
                    Daire {unit.unit_no}
                  </h3>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    unit.is_occupied
                      ? 'bg-orange-500/10 text-orange-400'
                      : 'bg-green-500/10 text-green-400'
                  }`}
                >
                  {unit.is_occupied ? 'Dolu' : 'Boş'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
