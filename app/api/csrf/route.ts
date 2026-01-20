import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf'

export async function GET() {
  const token = generateCSRFToken()
  const response = NextResponse.json({ success: true, token })

  response.cookies.set('csrf-token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 5,
  })

  return response
}
