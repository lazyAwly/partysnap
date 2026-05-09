import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GalleryClient } from './GalleryClient'
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
    <GuestNameLoader eventCode={eventCode}>
      {(guestName) => (
        <GalleryClient
          eventId={event.id}
          eventName={event.name}
          initialPhotos={initialPhotos}
          guestName={guestName}
        />
      )}
    </GuestNameLoader>
  )
}
