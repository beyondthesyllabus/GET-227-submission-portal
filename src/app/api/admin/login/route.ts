// src/app/api/admin/login/route.ts
import { NextResponse } from 'next/server';

// Simple mock authentication using environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Generate a simple token (in production use a real JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString('base64');
      return NextResponse.json({ success: true, token });
    }
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (err) {
    console.error('Login API error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
