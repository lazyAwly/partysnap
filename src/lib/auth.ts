import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'admin_session'
const COOKIE_VALUE = '1'

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect('/admin/login')
  }
}

export function makeAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    },
  }
}
