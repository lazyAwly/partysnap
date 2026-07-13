'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { compressImage } from '@/lib/compress'

const MAX_SIZE = 10 * 1024 * 1024

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; total: number; done: number; failed: number }
  | { status: 'done'; total: number; failed: number; error?: string }

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

    let done = 0
    let failed = 0
    let lastError: string | undefined

    setState({ status: 'uploading', total: files.length, done, failed })

    for (const file of files) {
      try {
        const compressed = await compressImage(file)
        if (compressed.size > MAX_SIZE) {
          throw new Error(
            `${file.name} is still too large after compression (${(compressed.size / 1024 / 1024).toFixed(1)}MB)`
          )
        }
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
      } catch (err) {
        failed++
        lastError = err instanceof Error ? err.message : String(err)
        console.error('Photo upload failed', { fileName: file.name, error: err })
      }
      setState({ status: 'uploading', total: files.length, done, failed })
    }

    setState({ status: 'done', total: files.length, failed, error: lastError })
    if (inputRef.current) inputRef.current.value = ''
    setTimeout(() => setState({ status: 'idle' }), lastError ? 8000 : 3000)
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
      {state.status === 'done' && state.error && (
        <p className="text-red-400 text-xs max-w-[220px] text-center">{state.error}</p>
      )}
    </div>
  )
}
