import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GuestNameLoader } from './GuestNameLoader'
import type { Upload } from '@/lib/supabase/types'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventCode: string }>
}) {
  const { eventCode } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, code, active')
    .eq('code', eventCode)
    .single()

  if (!event) notFound()

  if (!event.active) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">{event.name}</h1>
        <p className="text-gray-400 text-center">This event has ended. Thanks for being part of it!</p>
      </main>
    )
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  const initialPhotos = (uploads ?? []).map((u: Upload) => ({
    ...u,
    publicUrl: supabase.storage.from('photos').getPublicUrl(u.file_path).data.publicUrl,
  }))

  return (
    <GuestNameLoader
      eventCode={eventCode}
      eventId={event.id}
      eventName={event.name}
      initialPhotos={initialPhotos}
    />
  )
}
