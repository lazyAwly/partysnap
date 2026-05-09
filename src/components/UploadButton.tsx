'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress'

const MAX_SIZE = 10 * 1024 * 1024

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; total: number; done: number; failed: number }
  | { status: 'done'; total: number; failed: number }

export function UploadButton({
  eventId,
  guestName,
}: {
  eventId: string
  guestName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle' })

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const valid = files.filter((f) => f.size <= MAX_SIZE)
    const skipped = files.length - valid.length

    if (!valid.length) {
      setState({ status: 'done', total: 0, failed: skipped })
      if (inputRef.current) inputRef.current.value = ''
      setTimeout(() => setState({ status: 'idle' }), 3000)
      return
    }

    let done = 0
    let failed = skipped

    setState({ status: 'uploading', total: valid.length, done, failed })

    for (const file of valid) {
      try {
        const compressed = await compressImage(file)
        const id = crypto.randomUUID()
        const filePath = `${eventId}/${id}`
        const supabase = createClient()

        const { error: storageError } = await supabase.storage
          .from('photos')
          .upload(filePath, compressed)
        if (storageError) throw storageError

        const { error: dbError } = await supabase
          .from('uploads')
          .insert({ id, event_id: eventId, guest_name: guestName, file_path: filePath })
        if (dbError) throw dbError

        done++
      } catch {
        failed++
      }
      setState({ status: 'uploading', total: valid.length, done, failed })
    }

    setState({ status: 'done', total: valid.length, failed })
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => setState({ status: 'idle' }), 3000)
  }

  const label =
    state.status === 'idle'
      ? '📷 Upload Photos'
      : state.status === 'uploading'
      ? `Uploading ${state.done + 1} of ${state.total}…`
      : state.failed > 0
      ? `${state.total - state.failed} uploaded · ${state.failed} failed`
      : `${state.total} photo${state.total !== 1 ? 's' : ''} uploaded ✓`

  const progress =
    state.status === 'uploading' && state.total > 0
      ? state.done / state.total
      : null

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={state.status === 'uploading'}
        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-bold rounded-2xl shadow-2xl transition text-base min-w-[220px] text-center"
      >
        {label}
      </button>
      {progress !== null && (
        <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
