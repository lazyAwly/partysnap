import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { toggleEventActive } from '../../actions'
import { QRCode } from '@/components/QRCode'
import { ShareLinkButton } from '@/components/ShareLinkButton'
import { AdminPhotoGrid } from '@/components/AdminPhotoGrid'
import type { Upload } from '@/lib/supabase/types'

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${event.code}`

  const photos = (uploads ?? []).map((u: Upload) => ({
    id: u.id,
    guest_name: u.guest_name,
    event_id: u.event_id,
    publicUrl: supabase.storage.from('photos').getPublicUrl(u.file_path).data.publicUrl,
  }))

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-white">← Events</Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <span className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
          {event.active ? 'Active' : 'Inactive'}
        </span>
        <form action={toggleEventActive.bind(null, event.id, !event.active)}>
          <button type="submit" className="text-sm text-indigo-400 hover:text-indigo-300">
            {event.active ? 'Deactivate event' : 'Activate event'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 mb-6 flex flex-col items-center gap-4">
        <p className="text-sm text-gray-400">Print this QR code and put it at the party</p>
        <QRCode url={eventUrl} />
        <ShareLinkButton url={eventUrl} />
      </div>

      <div className="bg-gray-900 rounded-2xl p-6">
        <AdminPhotoGrid eventId={event.id} photos={photos} />
      </div>
    </main>
  )
}
