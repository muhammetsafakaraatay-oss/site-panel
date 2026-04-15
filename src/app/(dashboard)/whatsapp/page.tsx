'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { MessageSquare, Send, AlertCircle, CheckCircle2 } from 'lucide-react'

interface ResidentContact {
  id: string
  full_name: string
  phone: string | null
}

export default function WhatsAppPage() {
  const { activeSite } = useSite()
  const [residents, setResidents] = useState<ResidentContact[]>([])
  const [selectedResidents, setSelectedResidents] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!activeSite) return
    const siteId = activeSite.id

    async function loadInitialResidents() {
      const supabase = createClient()
      const { data } = await supabase
        .from('residents')
        .select('id, full_name, phone')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .not('phone', 'is', null)

      setResidents((data ?? []) as ResidentContact[])
    }

    void loadInitialResidents()
  }, [activeSite])

  function toggleResident(id: string) {
    setSelectedResidents(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  function selectAll() {
    if (selectedResidents.length === residents.length) {
      setSelectedResidents([])
    } else {
      setSelectedResidents(residents.map(r => r.id))
    }
  }

  async function sendMessages() {
    if (selectedResidents.length === 0 || !message.trim()) return
    
    setSending(true)
    setSuccess('')
    
    const selected = residents.filter(r => selectedResidents.includes(r.id))
    
    // WhatsApp linkleri oluştur
    const whatsappLinks = selected.map(r => {
      const text = encodeURIComponent(`Sayın ${r.full_name},\n\n${message}`)
      return `https://wa.me/${r.phone?.replace(/^0/, '90')}?text=${text}`
    })
    
    // İlk mesajı aç (demo için)
    if (whatsappLinks.length > 0) {
      window.open(whatsappLinks[0], '_blank')
      setSuccess(`${selected.length} kişiye mesaj gönderiliyor...`)
    }
    
    setSending(false)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MessageSquare className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">WhatsApp</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-white text-2xl font-bold">WhatsApp Mesajları</h2>
        <p className="text-gray-500 mt-1">Sakinlere toplu mesaj gönderin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol Kolon - Sakin Listesi */}
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Sakinler</h3>
            <button
              onClick={selectAll}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {selectedResidents.length === residents.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {residents.map(resident => (
              <label key={resident.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={selectedResidents.includes(resident.id)}
                  onChange={() => toggleResident(resident.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="text-white text-sm">{resident.full_name}</p>
                  <p className="text-gray-500 text-xs">{resident.phone}</p>
                </div>
              </label>
            ))}
            {residents.length === 0 && (
              <p className="text-gray-500 text-center py-8">Telefon numarası kayıtlı sakin bulunmuyor</p>
            )}
          </div>
        </div>

        {/* Sağ Kolon - Mesaj */}
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4">Mesajınız</h3>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Mesajınızı yazın..."
            rows={8}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
          />
          
          <div className="mt-4 p-3 bg-indigo-500/10 rounded-xl">
            <p className="text-indigo-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Mesajlar WhatsApp Web üzerinden açılacaktır. Göndermek için onay vermeniz gerekecektir.
            </p>
          </div>

          {success && (
            <div className="mt-3 p-3 bg-green-500/10 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <button
            onClick={sendMessages}
            disabled={sending || selectedResidents.length === 0 || !message.trim()}
            className="w-full mt-4 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {selectedResidents.length} Kişiye Mesaj Gönder
          </button>
        </div>
      </div>
    </div>
  )
}
