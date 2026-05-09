# PartySnap Gallery v2 — Design Spec

**Date:** 2026-05-09
**Goal:** Improve mobile UX and performance for 50-guest / 1000-1500 photo parties.

---

## Context

Current gallery: dark 3-col grid, single photo upload, no compression, no lazy loading.
Problems: slow on many photos, single upload annoying for guests, raw camera files (5-15MB) clog storage and load slowly.

---

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Visual style | Elegant / Premium | Full-width hero + 2-col grid, dark minimal aesthetic |
| Compression | Canvas resize | No deps, max 1920px JPEG 80%, 8MB → ~400KB typical |
| Multi-upload | Select multiple, upload sequentially | Familiar iOS/Android UX, avoids Supabase rate limits |
| Lazy loading | Native `loading="lazy"` | Zero JS overhead, sufficient for 1500 compressed images |
| Lightbox | Custom (no library) | Simple enough, avoids 50KB+ dependency |

---

## Architecture

3 files modified, 1 new:

```
src/lib/compress.ts                          NEW — canvas compression utility
src/components/UploadButton.tsx              MODIFY — multi-select + progress
src/app/[eventCode]/gallery/GalleryClient.tsx  MODIFY — elegant redesign + lazy load + lightbox
src/app/[eventCode]/gallery/GuestNameLoader.tsx  MINOR — pass-through props only if needed
```

No DB schema changes. No new API routes. All compression is client-side.

---

## compress.ts

```ts
// src/lib/compress.ts
export async function compressImage(
  file: File,
  maxWidth = 1920,
  quality = 0.8
): Promise<File>
```

**Algorithm:**
1. `createImageBitmap(file)` — decodes image (works for JPEG, PNG, WebP; iOS Safari auto-converts HEIC→JPEG before File API so no special handling needed)
2. Calculate scale: `scale = Math.min(1, maxWidth / bitmap.width)`
3. Draw to `<canvas>` at scaled dimensions
4. `canvas.toBlob('image/jpeg', quality)` → wrap as `File`
5. If result is larger than original (rare for already-compressed files), return original

---

## UploadButton

**Props:** same as before (`eventId`, `guestName`)

**State:**
```ts
type UploadState = 
  | { status: 'idle' }
  | { status: 'uploading'; total: number; done: number; failed: number }
  | { status: 'done'; total: number; failed: number }
```

**Behavior:**
- File input has `multiple` and `accept="image/*"`
- On change: filter files >10MB (warn in toast), compress remaining sequentially, upload each
- Upload = compress → storage.upload → uploads.insert
- Each success increments `done`; each failure increments `failed` (non-blocking)
- After all: show toast `"N uploaded · M failed"` (or just `"N photos uploaded"` if no failures), reset to idle after 3s
- Button text during upload: `"Uploading 2 of 7…"`
- Button is `disabled` during upload

**Position:** Fixed bottom-center on mobile, `position: fixed; bottom: 24px`

---

## GalleryClient — Layout

**Header (sticky):**
- Event name (bold)
- `● Live — N photos · M uploaders` (green dot, small text)
- No upload button in header (it's fixed at bottom)

**Gallery layout:**
- Photo 0 (newest): full-width hero, `aspect-ratio: 4/3`, rounded corners
- Photos 1+: 2-column grid, `aspect-ratio: 1`, gap 2px
- All `<img>` have `loading="lazy"` and `object-fit: cover`
- Guest name: absolute overlay at bottom of each photo, gradient fade, 0→1 opacity on hover (desktop) / always visible (mobile via `@media (hover: none)`)

**Lightbox:**
- State: `lightboxIndex: number | null`
- Tap any photo → set index → fullscreen overlay
- Overlay: black bg, centered `<img>`, ✕ top-right, `<` `>` arrows
- Swipe: track `touchstart`/`touchend` deltaX > 50px → prev/next
- Keyboard: ArrowLeft/ArrowRight/Escape
- Preload: set `new Image().src` for index±1

**Realtime:** unchanged — INSERT pushes to front of array, DELETE removes

---

## Mobile UX improvements

- Touch targets: all buttons minimum 44×44px
- Upload button: `rounded-2xl`, large, thumb-friendly at bottom of screen
- No horizontal scroll anywhere
- Font sizes: minimum 14px on mobile
- Images load progressively via lazy loading — no blank flash for off-screen photos

---

## Error handling

- Files >10MB: skipped with count added to final toast (no blocking alert)
- Compression failure: fall back to original file, proceed with upload
- Upload failure: increment `failed`, continue with remaining files
- Final toast: 3 seconds, bottom of screen, then disappears
- No retry UI — guest can tap upload button again

---

## Guest Photo Download

- In lightbox: download button (⬇) next to ✕
- `<a href={photo.publicUrl} download>` — triggers browser download
- On iOS Safari: opens photo in new tab (browser limitation); show tooltip "Long-press → Save to Photos"
- No server-side route needed — Supabase public URLs are directly downloadable

---

## Guest Onboarding (first-visit explanation)

Shown **once** when guest arrives at the gallery for the first time (localStorage flag `partysnap_onboarded_${eventCode}`).

**Format:** Bottom sheet (slides up from bottom), not a modal — feels native on mobile.

**Content:**
```
🎉 Welcome to [Event Name]!

📷 Upload your photos — tap the button below to share
👆 Tap any photo to view it full-screen
⬇  Tap the download icon to save a photo
```

**Behavior:**
- Appears automatically on first visit (after name is resolved)
- "Got it →" button dismisses and sets localStorage flag
- Never shown again for this event on this device
- Semi-transparent backdrop, sheet slides up with CSS transition

---

## Out of scope (this spec)

- Photo moderation
- Event expiry
- Rate limiting per guest
- Share link button
- Admin Realtime count update
