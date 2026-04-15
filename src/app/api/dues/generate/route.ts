import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const requestSchema = z.object({
  siteId: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
})

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Gecersiz istek.' }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Oturum bulunamadi.' }, { status: 401 })
  }

  const { siteId, period } = parsed.data
  const [year, month] = period.split('-').map(Number)

  const [{ data: definitions, error: definitionsError }, { data: residents, error: residentsError }] =
    await Promise.all([
      supabase
        .from('due_definitions')
        .select('id, name, amount, due_day')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .order('created_at'),
      supabase
        .from('residents')
        .select('id, unit_id')
        .eq('site_id', siteId)
        .eq('is_active', true)
        .not('unit_id', 'is', null),
    ])

  if (definitionsError || residentsError) {
    return NextResponse.json(
      { error: definitionsError?.message ?? residentsError?.message ?? 'Veriler alinamadi.' },
      { status: 500 }
    )
  }

  if (!definitions?.length || !residents?.length) {
    return NextResponse.json({ inserted: 0 })
  }

  const { data: existingDues, error: existingError } = await supabase
    .from('dues')
    .select('resident_id, unit_id, amount, due_date')
    .eq('site_id', siteId)
    .eq('period', period)

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 })
  }

  const existingKeys = new Set(
    (existingDues ?? []).map(
      (due) => `${due.resident_id}:${due.unit_id}:${due.amount}:${due.due_date ?? ''}`
    )
  )

  const rows = residents.flatMap((resident) =>
    (definitions ?? []).flatMap((definition) => {
      const day = Math.min(definition.due_day ?? 1, 28)
      const dueDateObj = new Date(year, month - 1, day)
      
      if (isNaN(dueDateObj.getTime())) {
        console.error('Gecersiz tarih:', year, month, day)
        return []
      }
      
      const dueDate = dueDateObj.toISOString().split('T')[0]

      const key = `${resident.id}:${resident.unit_id}:${definition.amount}:${dueDate}`
      if (existingKeys.has(key)) return []

      return [
        {
          site_id: siteId,
          resident_id: resident.id,
          unit_id: resident.unit_id,
          due_definition_id: definition.id,
          title: definition.name,
          amount: definition.amount,
          due_date: dueDate,
          period,
          status: 'pending',
        },
      ]
    })
  )

  if (!rows.length) {
    return NextResponse.json({ inserted: 0 })
  }

  const { error: insertError } = await supabase.from('dues').insert(rows)

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ inserted: rows.length })
}
