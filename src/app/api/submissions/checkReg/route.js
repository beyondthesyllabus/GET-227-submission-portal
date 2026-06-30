import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'submissions.json');

async function readDB() {
  try {
    const content = await readFile(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const reg = searchParams.get('reg');
  if (!reg) {
    return NextResponse.json({ error: 'Missing reg query param' }, { status: 400 });
  }
  const db = await readDB();
  const exists = db.some(entry => (entry.members || []).some(r => r && r.trim().toLowerCase() === reg.trim().toLowerCase()));
  return NextResponse.json({ exists });
}
