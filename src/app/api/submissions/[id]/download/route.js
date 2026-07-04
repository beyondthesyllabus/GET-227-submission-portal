import { NextResponse } from 'next/server'
import { supabase, BUCKET } from '../../../../../lib/supabase'

export async function GET(request, { params }) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  const { data: row, error: dbErr } = await supabase
    .from('submissions')
    .select('file_name, original_file_name')
    .eq('reference_code', id)
    .single()

  if (dbErr || !row || !row.file_name) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(row.file_name)

  if (error || !data) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'File download failed' }, { status: 500 })
  }

  const buffer = Buffer.from(await data.arrayBuffer())

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${row.original_file_name}"`,
      'Content-Type': 'application/octet-stream',
    },
  })
}
