'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSite } from '../layout'
import { Bell, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'

export default function NotificationsPage() {
  const { activeSite } = useSite()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    if (activeSite) {
      loadNotifications()
    }
  }, [activeSite])

  async function loadNotifications() {
    const supabase = createClient()
    const { data } = await supabase
      .from('payment_notifications')
      .select(`
        *,
        residents (full_name, phone),
        dues (title, amount, period)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    setNotifications(data || [])
    setLoading(false)
  }

  async function handleAction(notificationId: string, dueId: string, approve: boolean) {
    setProcessing(notificationId)
    
    const res = await fetch('/api/notifications/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, dueId, approve })
    })
    
    if (res.ok) {
      loadNotifications()
    } else {
      alert('Bir hata oluştu')
    }
    setProcessing(null)
  }

  if (!activeSite) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Bell className="w-16 h-16 text-gray-700 mb-4" />
        <h2 className="text-white text-xl font-semibold mb-2">Bildirimler</h2>
        <p className="text-gray-500">Lütfen bir site seçin</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-white text-2xl font-bold">Ödeme Bildirimleri</h2>
            <p className="text-gray-500 mt-1">{notifications.length} bekleyen bildirim</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
      ) : notifications.length === 0 ? (
        <div className="bg-[#13161f] border border-white/5 rounded-2xl p-12 text-center">
          <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">Bekleyen ödeme bildirimi yok</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div key={notif.id} className="bg-[#13161f] border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold">{notif.residents?.full_name}</h3>
                  <p className="text-gray-500 text-sm">{notif.residents?.phone}</p>
                </div>
                <span className="flex items-center gap-1 text-yellow-400 text-xs bg-yellow-500/10 px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" /> Bekliyor
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-gray-500 text-xs">Aidat</p>
                  <p className="text-white text-sm">{notif.dues?.title}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Dönem</p>
                  <p className="text-white text-sm">{notif.dues?.period}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Tutar</p>
                  <p className="text-indigo-400 font-semibold">{notif.amount} TL</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Ödeme Tarihi</p>
                  <p className="text-white text-sm">{notif.payment_date}</p>
                </div>
              </div>
              {notif.notes && (
                <div className="mb-4 p-2 bg-white/5 rounded-lg">
                  <p className="text-gray-500 text-xs">Açıklama</p>
                  <p className="text-gray-400 text-sm">{notif.notes}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => handleAction(notif.id, notif.due_id, true)} disabled={processing === notif.id} className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                  {processing === notif.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Onayla
                </button>
                <button onClick={() => handleAction(notif.id, notif.due_id, false)} disabled={processing === notif.id} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-2 rounded-lg flex items-center justify-center gap-2">
                  {processing === notif.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Reddet
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
