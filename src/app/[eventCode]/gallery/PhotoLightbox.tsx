'use client'
import { useEffect, useRef } from 'react'

type Photo = {
  id: string
  publicUrl: string
  guest_name: string
}

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const photo = photos[index]
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])

  useEffect(() => {
    if (photos[index - 1]) new Image().src = photos[index - 1].publicUrl
    if (photos[index + 1]) new Image().src = photos[index + 1].publicUrl
  }, [index, photos])

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX
    const deltaY = touchStartY.current - e.changedTouches[0].clientY
    if (deltaY < -80 && Math.abs(deltaY) > Math.abs(deltaX)) {
      onClose()
    } else if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 50) onNext()
      else if (deltaX < -50) onPrev()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.publicUrl}
          alt={photo.guest_name}
          className="max-w-full max-h-full object-contain"
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white w-11 h-11 flex items-center justify-center text-2xl bg-black/40 rounded-full"
          aria-label="Close"
        >
          ✕
        </button>

        <a
          href={photo.publicUrl}
          download
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-16 text-white w-11 h-11 flex items-center justify-center text-xl bg-black/40 rounded-full"
          aria-label="Download photo"
          title="iOS: long-press → Save to Photos"
        >
          ⬇
        </a>

        <p className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm px-4 truncate">
          {photo.guest_name}
        </p>

        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-white w-12 h-12 flex items-center justify-center text-3xl bg-black/40 rounded-full"
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        {index < photos.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white w-12 h-12 flex items-center justify-center text-3xl bg-black/40 rounded-full"
            aria-label="Next photo"
          >
            ›
          </button>
        )}
      </div>
    </div>
  )
}
