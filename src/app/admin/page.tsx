import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateEventForm } from './CreateEventForm'
import { APP_VERSION } from '@/lib/version'
import type { Event } from '@/lib/supabase/types'

type EventWithCount = Event & { uploads: { count: number }[] }

export default async function AdminPage() {
  await requireAdmin()

  const supabase = createServiceClient()
  const { data: events, error } = await supabase
    .from('events')
    .select('*, uploads(count)')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">PartySnap Admin</h1>
        <form action={async () => {
          'use server'
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          cookieStore.set('admin_session', '', { maxAge: 0, path: '/' })
          redirect('/admin/login')
        }}>
          <button type="submit" className="text-sm text-gray-400 hover:text-white">
            Log out
          </button>
        </form>
      </div>

      <CreateEventForm />

      {error && (
        <p className="text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 mb-6">
          Failed to load events: {error.message}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(events as EventWithCount[] | null)?.map((event) => (
          <Link
            key={event.id}
            href={`/admin/events/${event.id}`}
            className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition"
          >
            <div>
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-gray-400">
                /{event.code} · {event.uploads[0]?.count ?? 0} photos
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
              {event.active ? 'Active' : 'Inactive'}
            </span>
          </Link>
        ))}
        {!error && (!events || events.length === 0) && (
          <p className="text-gray-500 text-center py-8">No events yet. Create one above.</p>
        )}
      </div>

      <p className="text-xs text-gray-600 text-center mt-8">{APP_VERSION}</p>
    </main>
  )
}
