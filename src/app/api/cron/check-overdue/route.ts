import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  
  const today = new Date().toISOString().split("T")[0]
  
  const { data, error } = await supabase
    .from("dues")
    .update({ status: "overdue" })
    .eq("status", "pending")
    .lt("due_date", today)
    .select()
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ 
    success: true, 
    updated: data?.length || 0,
    message: `${data?.length || 0} aidat gecikmiş olarak işaretlendi`
  })
}
