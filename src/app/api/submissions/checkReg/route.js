import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const reg = searchParams.get('reg')

  if (!reg) {
    return NextResponse.json({ error: 'Missing reg query param' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('submissions')
    .select('members')

  if (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  const exists = (data || []).some(entry =>
    (entry.members || []).some(r =>
      r && r.trim().toLowerCase() === reg.trim().toLowerCase()
    )
  )

  return NextResponse.json({ exists })
}
