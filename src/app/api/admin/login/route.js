import { NextResponse } from 'next/server'

export async function POST(request) {
  const { username, password } = await request.json()

  const validUser = process.env.ADMIN_USERNAME || 'admin'
  const validPass = process.env.ADMIN_PASSWORD || 'admin123'

  if (username === validUser && password === validPass) {
    return NextResponse.json({ success: true, token: validPass })
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
}
