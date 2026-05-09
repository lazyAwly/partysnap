# Gallery v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the guest gallery with elegant UI, client-side image compression, multi-photo upload with progress, fullscreen lightbox with download, and a first-visit onboarding sheet.

**Architecture:** All changes are client-side React components. `compress.ts` is a pure utility. Three new components (`PhotoLightbox`, `OnboardingSheet`, redesigned `UploadButton`) compose into a redesigned `GalleryClient`. No DB changes, no new API routes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, @supabase/supabase-js, vitest

---

## File Map

```
src/lib/compress.ts                                   NEW — canvas compression + calculateScale
src/lib/compress.test.ts                              NEW — vitest unit tests for calculateScale
src/app/[eventCode]/gallery/PhotoLightbox.tsx         NEW — fullscreen photo viewer with swipe/download
src/app/[eventCode]/gallery/OnboardingSheet.tsx       NEW — first-visit bottom sheet
src/components/UploadButton.tsx                       MODIFY — multi-select, compress, progress bar
src/app/[eventCode]/gallery/GalleryClient.tsx         MODIFY — elegant layout, lazy load, integrate all
src/app/globals.css                                   MODIFY — add slide-up keyframe animation
```

---

## Task 1: Image Compression Utility

**Files:**
- Create: `src/lib/compress.ts`
- Create: `src/lib/compress.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/compress.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calculateScale } from './compress'

describe('calculateScale', () => {
  it('returns original dimensions when width <= maxWidth', () => {
    expect(calculateScale(800, 600, 1920)).toEqual({ w: 800, h: 600 })
  })

  it('scales down proportionally when width > maxWidth', () => {
    expect(calculateScale(3840, 2160, 1920)).toEqual({ w: 1920, h: 1080 })
  })

  it('handles portrait images (height > width, no scale needed)', () => {
    expect(calculateScale(1080, 1920, 1920)).toEqual({ w: 1080, h: 1920 })
  })

  it('scales wide portrait images', () => {
    expect(calculateScale(2400, 3200, 1920)).toEqual({ w: 1920, h: 2560 })
  })

  it('rounds dimensions to integers', () => {
    const { w, h } = calculateScale(3001, 2001, 1920)
    expect(Number.isInteger(w)).toBe(true)
    expect(Number.isInteger(h)).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module './compress'`

- [ ] **Step 3: Create compress.ts**

Create `src/lib/compress.ts`:
```ts
export function calculateScale(
  width: number,
  height: number,
  maxWidth: number
): { w: number; h: number } {
  if (width <= maxWidth) return { w: width, h: height }
  const scale = maxWidth / width
  return { w: Math.round(width * scale), h: Math.round(height * scale) }
}

export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const { w, h } = calculateScale(bitmap.width, bitmap.height, maxWidth)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.size >= file.size) {
          resolve(file)
        } else {
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
            })
          )
        }
      },
      'image/jpeg',
      quality
    )
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```
Expected: PASS — 5 tests passing (slugify 6 + compress 5 = 11 total if run together, or just compress 5)

- [ ] **Step 5: Commit**

```bash
git add src/lib/compress.ts src/lib/compress.test.ts
git commit -m "feat: add image compression utility with canvas resize"
```

---

## Task 2: PhotoLightbox Component

**Files:**
- Create: `src/app/[eventCode]/gallery/PhotoLightbox.tsx`

- [ ] **Step 1: Create PhotoLightbox.tsx**

Create `src/app/[eventCode]/gallery/PhotoLightbox.tsx`:
```tsx
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
  }

  function onTouchEnd(e: React.TouchEvent) {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (delta > 50) onNext()
    else if (delta < -50) onPrev()
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
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\[eventCode\]/gallery/PhotoLightbox.tsx
git commit -m "feat: add PhotoLightbox with swipe, keyboard nav, and download"
```

---

## Task 3: OnboardingSheet + Slide-up Animation

**Files:**
- Create: `src/app/[eventCode]/gallery/OnboardingSheet.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add slide-up keyframe to globals.css**

Open `src/app/globals.css` and add at the bottom:
```css
@keyframes slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
```

- [ ] **Step 2: Create OnboardingSheet.tsx**

Create `src/app/[eventCode]/gallery/OnboardingSheet.tsx`:
```tsx
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
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\[eventCode\]/gallery/OnboardingSheet.tsx src/app/globals.css
git commit -m "feat: add OnboardingSheet with slide-up animation"
```

---

## Task 4: UploadButton Redesign

**Files:**
- Modify: `src/components/UploadButton.tsx`

- [ ] **Step 1: Replace UploadButton.tsx**

Replace entire contents of `src/components/UploadButton.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UploadButton.tsx
git commit -m "feat: redesign UploadButton with multi-select, compression, and progress"
```

---

## Task 5: GalleryClient Redesign

**Files:**
- Modify: `src/app/[eventCode]/gallery/GalleryClient.tsx`

- [ ] **Step 1: Replace GalleryClient.tsx**

Replace entire contents of `src/app/[eventCode]/gallery/GalleryClient.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadButton } from '@/components/UploadButton'
import { PhotoLightbox } from './PhotoLightbox'
import { OnboardingSheet } from './OnboardingSheet'
import type { Upload } from '@/lib/supabase/types'

type Photo = Upload & { publicUrl: string }

export function GalleryClient({
  eventId,
  eventName,
  eventCode,
  initialPhotos,
  guestName,
}: {
  eventId: string
  eventName: string
  eventCode: string
  initialPhotos: Photo[]
  guestName: string
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`uploads:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const upload = payload.new as Upload
          const { data } = supabase.storage
            .from('photos')
            .getPublicUrl(upload.file_path)
          setPhotos((prev) => [{ ...upload, publicUrl: data.publicUrl }, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'uploads',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          setPhotos((prev) =>
            prev.filter((p) => p.id !== (payload.old as Upload).id)
          )
          setLightboxIndex(null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const uploaderCount = new Set(photos.map((p) => p.guest_name)).size

  const [hero, ...rest] = photos

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-32">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-gray-950/90 backdrop-blur border-b border-white/5 px-4 py-3">
        <h1 className="font-semibold text-white">{eventName}</h1>
        <p className="text-xs text-green-400">
          ● Live — {photos.length} photo{photos.length !== 1 ? 's' : ''} · {uploaderCount} uploader{uploaderCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Gallery */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 px-4">
          <p className="text-gray-500 text-center">No photos yet — be the first!</p>
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {/* Hero: newest photo, full width */}
          <div className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={hero.publicUrl}
              alt={hero.guest_name}
              loading="lazy"
              className="w-full h-full object-cover rounded-2xl cursor-pointer"
              onClick={() => setLightboxIndex(0)}
            />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3 rounded-b-2xl">
              <p className="text-white text-sm truncate">{hero.guest_name}</p>
            </div>
          </div>

          {/* 2-column grid for remaining photos */}
          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {rest.map((photo, i) => (
                <div key={photo.id} className="relative aspect-square">
                  <img
                    src={photo.publicUrl}
                    alt={photo.guest_name}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-xl cursor-pointer"
                    onClick={() => setLightboxIndex(i + 1)}
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-xl opacity-0 hover:opacity-100 transition">
                    <p className="text-white text-xs truncate">{photo.guest_name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Fixed upload button */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-30">
        <UploadButton eventId={eventId} guestName={guestName} />
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => Math.max(0, (i ?? 0) - 1))}
          onNext={() => setLightboxIndex((i) => Math.min(photos.length - 1, (i ?? 0) + 1))}
        />
      )}

      {/* First-visit onboarding */}
      <OnboardingSheet eventName={eventName} eventCode={eventCode} />
    </div>
  )
}
```

- [ ] **Step 2: Update GuestNameLoader to pass eventCode**

Open `src/app/[eventCode]/gallery/GuestNameLoader.tsx`. The component currently passes `eventId`, `eventName`, `initialPhotos` to `GalleryClient`. Add `eventCode`:

```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GalleryClient } from './GalleryClient'
import type { Upload } from '@/lib/supabase/types'

type Photo = Upload & { publicUrl: string }

export function GuestNameLoader({
  eventCode,
  eventId,
  eventName,
  initialPhotos,
}: {
  eventCode: string
  eventId: string
  eventName: string
  initialPhotos: Photo[]
}) {
  const [guestName, setGuestName] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const name = localStorage.getItem(`partysnap_name_${eventCode}`)
    if (!name) {
      router.replace(`/${eventCode}`)
    } else {
      setGuestName(name)
    }
  }, [eventCode, router])

  if (!guestName) return null

  return (
    <GalleryClient
      eventId={eventId}
      eventName={eventName}
      eventCode={eventCode}
      initialPhotos={initialPhotos}
      guestName={guestName}
    />
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: all tests pass (11 total: 6 slugify + 5 compress)

- [ ] **Step 5: Commit**

```bash
git add src/app/\[eventCode\]/gallery/GalleryClient.tsx src/app/\[eventCode\]/gallery/GuestNameLoader.tsx
git commit -m "feat: redesign GalleryClient with elegant layout, lightbox, and onboarding"
```

---

## Manual Test Checklist

Before deploying, test locally with `npm run dev`:

- [ ] First visit to gallery → onboarding sheet slides up
- [ ] "Got it →" dismisses sheet, never shown again on refresh
- [ ] Tap photo → fullscreen lightbox opens
- [ ] Swipe left/right → navigates photos
- [ ] Arrow keys navigate (desktop)
- [ ] ✕ closes lightbox, tap backdrop closes
- [ ] ⬇ download button → file downloads (or iOS long-press prompt visible)
- [ ] Upload Photos button → multi-select picker opens
- [ ] Select 3 photos → progress bar shows "Uploading 1 of 3…"
- [ ] Uploaded photos appear in Realtime on another tab/window
- [ ] Newest photo shows as full-width hero
- [ ] Photos have `loading="lazy"` (check DevTools Network tab — images off-screen don't load)
- [ ] File >10MB → counted as failed in toast
- [ ] Guest name shows on hero photo overlay
