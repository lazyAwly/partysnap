import { NextRequest, NextResponse } from 'next/server'
import { makeAdminCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  const cookie = makeAdminCookie()
  res.cookies.set(cookie.name, cookie.value, cookie.options)
  return res
}
