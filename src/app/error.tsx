'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 px-4">
      <div className="text-5xl">⚠️</div>
      <div className="text-center">
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-gray-400 text-sm">
          {error.message || 'An unexpected error occurred.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition"
      >
        Try again
      </button>
    </main>
  )
}
