'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadButton } from '@/components/UploadButton'
import type { Upload } from '@/lib/supabase/types'

type Photo = Upload & { publicUrl: string }

export function GalleryClient({
  eventId,
  eventName,
  initialPhotos,
  guestName,
}: {
  eventId: string
  eventName: string
  initialPhotos: Photo[]
  guestName: string
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`uploads:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const upload = payload.new as Upload
          const { data } = supabase.storage
            .from('photos')
            .getPublicUrl(upload.file_path)
          setPhotos((prev) => [{ ...upload, publicUrl: data.publicUrl }, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setPhotos((prev) =>
            prev.filter((p) => p.id !== (payload.old as Upload).id)
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const uploaderCount = new Set(photos.map((p) => p.guest_name)).size

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">{eventName}</h1>
          <p className="text-xs text-green-400">
            ● Live — {photos.length} photos · {uploaderCount} uploaders
          </p>
        </div>
        <UploadButton eventId={eventId} guestName={guestName} />
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">No photos yet — be the first!</p>
          <UploadButton eventId={eventId} guestName={guestName} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.publicUrl}
                alt={photo.guest_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition">
                <p className="text-white text-xs truncate">{photo.guest_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
