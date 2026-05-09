'use client'
import { useState } from 'react'

type Photo = {
  id: string
  guest_name: string
  publicUrl: string
  event_id: string
}

export function AdminPhotoGrid({
  eventId,
  photos: initialPhotos,
}: {
  eventId: string
  photos: Photo[]
}) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function deletePhoto(uploadId: string) {
    setDeleting(uploadId)
    const res = await fetch(`/api/events/${eventId}/photos/${uploadId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== uploadId))
    }
    setDeleting(null)
  }

  async function downloadAll() {
    setDownloading(true)
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    await Promise.all(
      photos.map(async (photo) => {
        const res = await fetch(photo.publicUrl)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] || 'jpg'
        zip.file(`${photo.guest_name}-${photo.id.slice(0, 8)}.${ext}`, blob)
      })
    )
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'party-photos.zip'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400">{photos.length} photos</p>
        {photos.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {downloading ? 'Zipping…' : `⬇ Download All`}
          </button>
        )}
      </div>

      {photos.length === 0 && (
        <p className="text-gray-500 text-center py-12">No photos yet.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={photo.publicUrl}
              alt={photo.guest_name}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex flex-col items-center justify-center gap-2">
              <p className="text-white text-xs font-medium">{photo.guest_name}</p>
              <button
                onClick={() => deletePhoto(photo.id)}
                disabled={deleting === photo.id}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded-lg"
              >
                {deleting === photo.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
