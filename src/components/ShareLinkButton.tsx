'use client'
import { useState } from 'react'

export function ShareLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="text-sm px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
    >
      {copied ? '✓ Copied!' : '🔗 Copy guest link'}
    </button>
  )
}
