import { NextResponse } from 'next/server'
import { supabase, BUCKET } from '../../../../lib/supabase'

async function getSubmission(referenceCode) {
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('reference_code', referenceCode)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    referenceCode: data.reference_code,
    groupName: data.group_name,
    department: data.department,
    level: data.level,
    projectTitle: data.project_title,
    members: data.members || [],
    fileName: data.file_name,
    originalFileName: data.original_file_name,
    submittedAt: data.submitted_at,
  }
}

// GET /api/submissions/[id] — Get a single submission by reference code
export async function GET(request, { params }) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const submission = await getSubmission(id)

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }

  return NextResponse.json(submission)
}

// POST /api/submissions/[id] — Download the uploaded file
export async function POST(request, { params }) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const submission = await getSubmission(id)

  if (!submission || !submission.fileName) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(submission.fileName)

  if (error || !data) {
    console.error('Download error:', error)
    return NextResponse.json({ error: 'File download failed' }, { status: 500 })
  }

  const buffer = Buffer.from(await data.arrayBuffer())

  return new NextResponse(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${submission.originalFileName}"`,
      'Content-Type': 'application/octet-stream',
    },
  })
}
