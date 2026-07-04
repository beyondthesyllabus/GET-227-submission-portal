import { NextResponse } from 'next/server'
import { supabase, BUCKET } from '../../../lib/supabase'

// POST /api/submissions — Save a new submission
export async function POST(request) {
  try {
    const formData = await request.formData()

    const groupName    = formData.get('groupName')
    const department   = formData.get('department')
    const level        = formData.get('level')
    const projectTitle = formData.get('projectTitle')
    const file         = formData.get('projectFile')

    // Collect all 5 registration numbers
    const members = []
    for (let i = 1; i <= 5; i++) {
      members.push(formData.get(`reg${i}`) || '')
    }

    // Validate required fields
    if (!groupName || !department || !level || !projectTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check for duplicate registration numbers
    const nonEmptyMembers = members.filter(r => r.trim())
    if (nonEmptyMembers.length > 0) {
      const { data: existingRows, error: checkErr } = await supabase
        .from('submissions')
        .select('members')

      if (checkErr) {
        console.error('DB check error:', checkErr)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const existingRegs = new Set()
      ;(existingRows || []).forEach(entry => {
        ;(entry.members || []).forEach(reg => {
          if (reg) existingRegs.add(reg.trim().toLowerCase())
        })
      })

      const duplicateRegs = members.filter(reg => {
        const trimmed = reg.trim().toLowerCase()
        return trimmed && existingRegs.has(trimmed)
      })

      if (duplicateRegs.length > 0) {
        return NextResponse.json(
          { error: `Registration number(s) already submitted: ${duplicateRegs.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Upload file to Supabase Storage
    let savedFileName = null
    let originalFileName = null
    if (file && file.size > 0) {
      const MAX_SIZE = 500 * 1024 * 1024 // 500 MB limit
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'Folder exceeds 500 MB limit.' }, { status: 413 })
      }

      const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(safeFileName, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadErr) {
        console.error('Upload error:', uploadErr)
        return NextResponse.json({ error: 'File upload failed' }, { status: 500 })
      }

      savedFileName = safeFileName
      originalFileName = file.name
    }

    // Generate unique reference code
    const referenceCode = `GET2227-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    // Insert into Supabase
    const { error: insertErr } = await supabase.from('submissions').insert({
      id: referenceCode,
      reference_code: referenceCode,
      group_name: groupName,
      department,
      level,
      project_title: projectTitle,
      members,
      file_name: savedFileName,
      original_file_name: originalFileName,
    })

    if (insertErr) {
      console.error('Insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 })
    }

    return NextResponse.json({ referenceCode }, { status: 201 })
  } catch (error) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/submissions — Get all submissions (admin only)
export async function GET(request) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .order('submitted_at', { ascending: false })

  if (error) {
    console.error('Fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
  }

  // Map snake_case DB columns back to camelCase for the frontend
  const mapped = (data || []).map(row => ({
    id: row.id,
    referenceCode: row.reference_code,
    groupName: row.group_name,
    department: row.department,
    level: row.level,
    projectTitle: row.project_title,
    members: row.members || [],
    fileName: row.file_name,
    originalFileName: row.original_file_name,
    submittedAt: row.submitted_at,
  }))

  return NextResponse.json(mapped)
}
