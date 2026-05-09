'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadButton } from '@/components/UploadButton'
import { PhotoLightbox } from './PhotoLightbox'
import { OnboardingSheet } from './OnboardingSheet'
import { thumbnailUrl } from '@/lib/thumbnail'
import type { Upload } from '@/lib/supabase/types'

type Photo = Upload & { publicUrl: string }

const PAGE_SIZE = 50

export function GalleryClient({
  eventId,
  eventName,
  eventCode,
  initialPhotos,
  guestName,
  hasMore: initialHasMore,
}: {
  eventId: string
  eventName: string
  eventCode: string
  initialPhotos: Photo[]
  guestName: string
  hasMore: boolean
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function deleteMyPhoto(photoId: string) {
    setDeleting(photoId)
    const photo = photos.find((p) => p.id === photoId)
    if (!photo) { setDeleting(null); return }
    await fetch(`/api/events/${eventId}/photos/${photoId}`, {
      method: 'DELETE',
      headers: { 'x-guest-name': guestName },
    })
    setDeleting(null)
  }

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
          setLightboxIndex(null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  async function loadMore() {
    const oldest = photos[photos.length - 1]
    if (!oldest || loadingMore) return

    setLoadingMore(true)
    const supabase = createClient()

    const { data: uploads } = await supabase
      .from('uploads')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .lt('created_at', oldest.created_at)
      .limit(PAGE_SIZE)

    const newPhotos = (uploads ?? []).map((u: Upload) => ({
      ...u,
      publicUrl: supabase.storage.from('photos').getPublicUrl(u.file_path).data.publicUrl,
    }))

    setPhotos((prev) => [...prev, ...newPhotos])
    setHasMore(newPhotos.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  const uploaderCount = new Set(photos.map((p) => p.guest_name)).size

  const [hero, ...rest] = photos

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-white/5 px-4 py-3">
        <h1 className="font-semibold text-white">{eventName}</h1>
        <p className="text-xs text-green-400">
          ● Live — {photos.length} photo{photos.length !== 1 ? 's' : ''} · {uploaderCount} uploader{uploaderCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Gallery */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
          <p className="text-gray-500 text-center">No photos yet — be the first!</p>
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {/* Hero: newest photo, full width */}
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={thumbnailUrl(hero.publicUrl, 1200)}
              alt={hero.guest_name}
              loading="lazy"
              className="w-full h-full object-cover rounded-2xl cursor-pointer"
              onClick={() => setLightboxIndex(0)}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-2xl flex items-end justify-between">
              <p className="text-white text-sm truncate">{hero.guest_name}</p>
              {hero.guest_name === guestName && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMyPhoto(hero.id) }}
                  disabled={deleting === hero.id}
                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 ml-2 shrink-0"
                >
                  {deleting === hero.id ? '…' : 'Delete'}
                </button>
              )}
            </div>
          </div>

          {/* 2-column grid for remaining photos */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {rest.map((photo, i) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={thumbnailUrl(photo.publicUrl, 400)}
                    alt={photo.guest_name}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-xl cursor-pointer"
                    onClick={() => setLightboxIndex(i + 1)}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-xl opacity-0 hover:opacity-100 transition flex items-end justify-between">
                    <p className="text-white text-xs truncate">{photo.guest_name}</p>
                    {photo.guest_name === guestName && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMyPhoto(photo.id) }}
                        disabled={deleting === photo.id}
                        className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 ml-1 shrink-0"
                      >
                        {deleting === photo.id ? '…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center py-4">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl text-sm transition"
              >
                {loadingMore ? 'Loading…' : 'Load more photos'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Fixed upload button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30">
        <UploadButton eventId={eventId} guestName={guestName} />
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
        />
      )}

      {/* First-visit onboarding */}
      <OnboardingSheet eventName={eventName} eventCode={eventCode} />
    </div>
  )
}
