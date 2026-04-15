import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dueId, residentId, amount, paymentDate, notes } = await request.json()

  const { data: notification, error } = await supabase
    .from('payment_notifications')
    .insert({
      due_id: dueId,
      resident_id: residentId,
      amount: amount,
      payment_date: paymentDate,
      notes: notes,
      status: 'pending',
      created_by: user.id
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ 
    success: true, 
    notification,
    message: 'Ödeme bildirimi alındı, yönetici onayı bekleniyor'
  })
}
