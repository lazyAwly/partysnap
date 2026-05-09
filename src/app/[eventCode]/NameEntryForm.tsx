'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NameEntryForm({ eventCode }: { eventCode: string }) {
  const [name, setName] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    localStorage.setItem(`partysnap_name_${eventCode}`, trimmed)
    router.push(`/${eventCode}/gallery`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={50}
        autoFocus
        className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:border-indigo-500 text-center"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
      >
        Join Party →
      </button>
    </form>
  )
}
