import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const UPLOADS_PATH = path.join(process.cwd(), 'uploads')
const DB_PATH = path.join(process.cwd(), 'data', 'submissions.json')

async function readDB() {
  try {
    const content = await readFile(DB_PATH, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

export async function GET(request, { params }) {
  const authHeader = request.headers.get('x-admin-password')
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const db = await readDB()
  const submission = db.find(s => s.referenceCode === id)

  if (!submission || !submission.fileName) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const filePath = path.join(UPLOADS_PATH, submission.fileName)
  const fileBuffer = await readFile(filePath)

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Disposition': `attachment; filename="${submission.originalFileName}"`,
      'Content-Type': 'application/octet-stream',
    },
  })
}
