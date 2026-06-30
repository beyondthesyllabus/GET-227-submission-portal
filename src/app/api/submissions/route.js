import { NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'submissions.json')
const UPLOADS_PATH = path.join(process.cwd(), 'uploads')

async function ensureDirs() {
  const dataDir = path.join(process.cwd(), 'data')
  if (!existsSync(dataDir)) await mkdir(dataDir, { recursive: true })
  if (!existsSync(UPLOADS_PATH)) await mkdir(UPLOADS_PATH, { recursive: true })
}

async function readDB() {
  try {
    const content = await readFile(DB_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

async function writeDB(data) {
  await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// POST /api/submissions — Save a new submission
export async function POST(request) {
  try {
    await ensureDirs()

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

    // Save uploaded file
    let savedFileName = null
    if (file && file.size > 0) {
  const MAX_SIZE = 500 * 1024 * 1024; // 500 MB limit
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Folder exceeds 500 MB limit.' }, { status: 413 });
  }
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const safeFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(UPLOADS_PATH, safeFileName);
  await writeFile(filePath, buffer);
  savedFileName = safeFileName;
}

    // Generate unique reference code
    const referenceCode = `GET2227-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

    const submission = {
      id: referenceCode,
      referenceCode,
      groupName,
      department,
      level,
      projectTitle,
      members,
      fileName: savedFileName,
      originalFileName: file?.name || null,
      submittedAt: new Date().toISOString(),
    }

    // Append to database with duplicate check
    const db = await readDB()
    // Gather all existing registration numbers
    const existingRegs = new Set()
    db.forEach(entry => {
      ;(entry.members || []).forEach(reg => {
        if (reg) existingRegs.add(reg.trim().toLowerCase())
      })
    })
    // Check new members against existing set
    const duplicateRegs = members.filter(reg => {
      const trimmed = reg.trim().toLowerCase()
      return trimmed && existingRegs.has(trimmed)
    })
    if (duplicateRegs.length > 0) {
      return NextResponse.json({ error: `Registration number(s) already submitted: ${duplicateRegs.join(', ')}` }, { status: 400 })
    }
    // Append to database
    db.push(submission)
    await writeDB(db)

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

  await ensureDirs()
  const db = await readDB()
  return NextResponse.json(db)
}
