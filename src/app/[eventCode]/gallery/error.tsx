'use client'

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-5xl">📷</div>
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Couldn't load the gallery</h1>
        <p className="text-gray-400 text-sm">
          Check your connection and try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
      >
        Reload gallery
      </button>
    </main>
  )
}
