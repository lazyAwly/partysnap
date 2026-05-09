'use client'
import { useEffect, useState } from 'react'
import QRCodeLib from 'qrcode'

export function QRCode({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState('')

  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setDataUrl)
  }, [url])

  function download() {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'partysnap-qr.png'
    a.click()
  }

  if (!dataUrl) return <div className="w-[280px] h-[280px] bg-gray-800 rounded-lg animate-pulse" />

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={dataUrl} alt="QR Code" width={280} height={280} className="rounded-lg" />
      <p className="text-xs text-gray-400">{url}</p>
      <button
        onClick={download}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
      >
        Download QR PNG
      </button>
    </div>
  )
}
