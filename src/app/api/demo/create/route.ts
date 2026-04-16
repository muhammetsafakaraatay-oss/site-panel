import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  
  // Benzersiz email oluştur
  const uniqueId = Math.random().toString(36).substring(2, 10)
  const email = `demo_${uniqueId}@temp.siteyonetimapp.com`
  const password = 'Demo123456'
  
  // 1. Kullanıcı oluştur
  const { data: userData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: 'Demo Kullanıcı' }
    }
  })
  
  if (signUpError) {
    return NextResponse.json({ error: signUpError.message }, { status: 500 })
  }
  
  if (!userData.user) {
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }
  
  // 2. Şirket oluştur
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: `Demo Şirket ${uniqueId}`, email })
    .select()
    .single()
  
  if (companyError) {
    return NextResponse.json({ error: companyError.message }, { status: 500 })
  }
  
  // 3. Profili güncelle
  await supabase
    .from('profiles')
    .update({ company_id: company.id, full_name: 'Demo Kullanıcı' })
    .eq('id', userData.user.id)
  
  // 4. Örnek site oluştur
  const { data: site } = await supabase
    .from('sites')
    .insert({ company_id: company.id, name: 'Demo Sitesi', city: 'İstanbul' })
    .select()
    .single()
  
  // 5. Örnek blok ve daireler
  if (site) {
    const { data: block } = await supabase
      .from('blocks')
      .insert({ site_id: site.id, name: 'A Blok' })
      .select()
      .single()
    
    if (block) {
      await supabase.from('units').insert([
        { site_id: site.id, block_id: block.id, unit_no: '1', is_occupied: false },
        { site_id: site.id, block_id: block.id, unit_no: '2', is_occupied: false },
        { site_id: site.id, block_id: block.id, unit_no: '3', is_occupied: false },
      ])
    }
  }
  
  // 6. Otomatik giriş yap
  const { data: session } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  
  return NextResponse.json({ 
    success: true, 
    email,
    password,
    access_token: session.session?.access_token 
  })
}
