# PartySnap — Design Spec

**Date:** 2026-05-09  
**Stack:** Next.js (App Router) · Supabase · Vercel  

---

## Overview

Web app that lets party guests scan a QR code, enter their name, upload photos, and see all party photos in a live gallery in real-time. Host manages events via a password-protected admin panel.

No app install required. Works on any phone browser.

---

## User Flows

### Guest Flow
1. Host prints QR code, places it at the party
2. Guest scans QR → opens `partysnap.vercel.app/[eventCode]`
3. Guest enters name → stored in `localStorage`, no account needed
4. Guest lands on `/[eventCode]/gallery`
5. Guest taps Upload → native file picker → selects from camera roll or takes photo
6. Photo uploads to Supabase Storage → record inserted into `uploads` table
7. All guests on the gallery page see the new photo appear within ~1 second via Supabase Realtime
8. Photos displayed in a grid with uploader name as caption

### Host Flow
1. Host visits `/admin`, enters `ADMIN_PASSWORD` → session cookie set
2. Host creates an event: sets name → system generates a short slug (e.g. `mikes-bday`)
3. Admin panel shows QR code for the event URL — host downloads and prints it
4. During party: host can view all uploads, delete individual photos
5. After party: host clicks "Download All" to get a zip of all photos
6. Host can deactivate an event (stops new uploads)

---

## Architecture

```
Guest/Host Browser
      ↕
Next.js App Router (Vercel)
  - /admin          → host panel (password protected)
  - /[eventCode]    → guest name entry
  - /[eventCode]/gallery → live gallery + upload
      ↕
Supabase
  - PostgreSQL DB   → events + uploads tables
  - Storage         → photos bucket (public read)
  - Realtime        → INSERT subscription on uploads
```

---

## Data Model

### `events`
| column | type | notes |
|--------|------|-------|
| id | uuid | primary key |
| name | text | display name, e.g. "Mike's Birthday Party" |
| code | text | unique slug, e.g. "mikes-bday" |
| active | boolean | false = no new uploads accepted |
| created_at | timestamptz | |

### `uploads`
| column | type | notes |
|--------|------|-------|
| id | uuid | primary key |
| event_id | uuid | foreign key → events.id |
| guest_name | text | entered by guest |
| file_path | text | Supabase Storage path: `{event_id}/{id}.jpg` |
| created_at | timestamptz | |

---

## Pages

### `/admin`
- Password gate (env var `ADMIN_PASSWORD`, session cookie)
- Event list: name, slug, photo count, guest count, active toggle
- Create event form: name input → auto-generate slug → show QR code
- Event detail: QR code (downloadable PNG), photo grid with per-photo delete, "Download All" button

### `/[eventCode]`
- Shows event name and tagline
- Name input field → "Join Party" button
- Saves name to `localStorage` keyed by eventCode
- Redirects to `/[eventCode]/gallery`
- If event inactive: shows "This event has ended" message

### `/[eventCode]/gallery`
- Reads guest name from `localStorage` (if missing, redirects back to name entry)
- Photo grid (newest first), each photo shows uploader name as caption
- Upload button → native `<input type="file" accept="image/*" capture="environment">`
- Supabase Realtime subscription: new `uploads` rows appear instantly
- Live indicator: "● Live — N photos · M uploaders" (M = distinct guest_name count in uploads for this event)

---

## Real-time

Supabase Realtime channel on `uploads` table, filtered by `event_id`. On INSERT event, fetch the new upload's public URL and prepend to gallery grid. No polling. Reconnects automatically on drop.

---

## Storage

- Supabase Storage bucket: `photos` (public read)
- Upload path: `{event_id}/{upload_id}`
- Client uploads directly to Supabase Storage from browser (no server relay)
- File size limit: 10MB enforced client-side before upload attempt
- Accepted types: `image/*`

---

## Auth

- **Admin:** Single `ADMIN_PASSWORD` env var. POST to `/api/admin/login` sets a signed session cookie. All `/admin` routes check cookie server-side.
- **Guests:** No auth. Name stored in `localStorage`. No PII collected beyond the name they enter.

---

## QR Code

- Generated in admin panel using `qrcode` npm package (client-side, no server needed)
- Renders as PNG, downloadable
- Points to: `https://[deploy-url]/[eventCode]`

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| File > 10MB | Client-side rejection before upload, toast error |
| Upload fails | Toast error with retry option |
| Realtime disconnects | Auto-reconnects; stale gallery visible until reconnect |
| Admin deletes photo | Removed from all guests' galleries in real-time |
| Event inactive | Name entry page shows "event ended" message |
| Unknown eventCode | 404 page |

---

## Tech Dependencies

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `@supabase/supabase-js` | DB, Storage, Realtime client |
| `@supabase/ssr` | Server-side Supabase auth helpers |
| `qrcode` | QR code generation |
| `tailwindcss` | Styling |
| `jszip` | Client-side zip for "Download All" |

---

## Hosting & Free Tier Limits

- **Vercel** free tier: unlimited deployments, 100GB bandwidth/month
- **Supabase** free tier: 500MB DB, 1GB Storage, 2GB bandwidth, Realtime included
- Expected usage per party: ~50 photos × 3MB avg = ~150MB storage. Well within limits.
- Note: Supabase free projects pause after 1 week of inactivity. Unpause before the party.

---

## Out of Scope (MVP)

- Video upload
- Photo comments or reactions
- Push notifications
- Multiple admins
- Guest moderation (guests cannot delete others' photos)
- Slideshow / projector mode
