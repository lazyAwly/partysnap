'use client'
import { useEffect, useState } from 'react'

export function OnboardingSheet({
  eventName,
  eventCode,
}: {
  eventName: string
  eventCode: string
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const key = `partysnap_onboarded_${eventCode}`
    if (!localStorage.getItem(key)) setShow(true)
  }, [eventCode])

  function dismiss() {
    localStorage.setItem(`partysnap_onboarded_${eventCode}`, '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={dismiss}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 rounded-t-3xl p-6 pb-10 animate-slide-up">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🎉</div>
          <h2 className="text-xl font-bold text-white">Welcome to {eventName}!</h2>
        </div>
        <ul className="space-y-4 mb-8">
          <li className="flex items-center gap-4 text-gray-300">
            <span className="text-2xl w-8 text-center">📷</span>
            <span>Tap the button below to upload your photos</span>
          </li>
          <li className="flex items-center gap-4 text-gray-300">
            <span className="text-2xl w-8 text-center">👆</span>
            <span>Tap any photo to view it full-screen</span>
          </li>
          <li className="flex items-center gap-4 text-gray-300">
            <span className="text-2xl w-8 text-center">⬇</span>
            <span>Tap the download icon to save a photo to your phone</span>
          </li>
        </ul>
        <button
          onClick={dismiss}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-lg transition"
        >
          Got it →
        </button>
      </div>
    </>
  )
}
