'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE = 10 * 1024 * 1024

export function UploadButton({
  eventId,
  guestName,
}: {
  eventId: string
  guestName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError('Photo must be under 10MB')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      const id = crypto.randomUUID()
      const filePath = `${eventId}/${id}`
      const supabase = createClient()

      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('uploads')
        .insert({ id, event_id: eventId, guest_name: guestName, file_path: filePath })

      if (dbError) throw dbError
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-lg"
      >
        {uploading ? 'Uploading…' : '📷 Upload Photo'}
      </button>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
