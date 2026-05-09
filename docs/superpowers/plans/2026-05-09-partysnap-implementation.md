# PartySnap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where party guests scan a QR code, enter their name, upload photos, and see a live gallery — with a password-protected admin panel for the host.

**Architecture:** Next.js App Router on Vercel with Supabase for database (events + uploads), Storage (photos bucket), and Realtime (live gallery). Admin mutations use Server Actions; guest uploads go browser-to-Supabase directly. Admin routes protected by a session cookie checked server-side.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 4, @supabase/supabase-js, @supabase/ssr, qrcode, jszip, vitest

---

## File Map

```
src/
  app/
    layout.tsx                          # Root layout, Tailwind base
    page.tsx                            # Redirect → /admin
    admin/
      login/page.tsx                    # Login form + POST to /api/admin/login
      page.tsx                          # Event list + create form (server component)
      events/[id]/page.tsx             # Event detail: QR, photos, toggle, download
      actions.ts                        # Server Actions: createEvent, toggleEventActive
    [eventCode]/
      page.tsx                          # Guest name entry
      gallery/
        page.tsx                        # Server: load event + initial photos → GalleryClient
        GalleryClient.tsx               # Client: Realtime subscription + UploadButton
    api/
      admin/
        login/route.ts                  # POST: verify password → set cookie
        logout/route.ts                 # POST: clear cookie
      events/[id]/photos/[uploadId]/
        route.ts                        # DELETE: remove photo from storage + DB
  lib/
    supabase/
      types.ts                          # Event, Upload TypeScript types
      client.ts                         # Browser Supabase client (createBrowserClient)
      server.ts                         # Server Supabase client (createServerClient + cookies)
      service.ts                        # Service-role client for admin mutations
    auth.ts                             # isAdmin(), requireAdmin()
    slugify.ts                          # name → url-safe slug
    slugify.test.ts                     # Vitest unit tests
  components/
    QRCode.tsx                          # Client: renders QR as img, download PNG button
    AdminPhotoGrid.tsx                  # Client: photo grid + delete + download all (JSZip)
    UploadButton.tsx                    # Client: file input → Supabase Storage upload
supabase/
  migrations/001_initial.sql           # Tables, RLS, storage bucket, Realtime
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `.env.local`
- Create: `.env.example`
- Create: `vitest.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

Run inside `/Users/familieanders/Desktop/PartySnap`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*" --yes
```
Expected: project files created, `npm run dev` works at http://localhost:3000

- [ ] **Step 2: Install additional dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr qrcode jszip
npm install -D vitest @types/qrcode
```

- [ ] **Step 3: Create vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 4: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 5: Create .env.example**

Create `.env.example`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_PASSWORD=choose-a-strong-password
```

- [ ] **Step 6: Create .env.local**

Create `.env.local` (fill in after Supabase setup in Task 2):
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=party123
```

- [ ] **Step 7: Add .env.local to .gitignore**

Verify `.gitignore` contains `.env.local` (create-next-app adds it by default). Also add:
```
.env.local
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with dependencies"
```

---

## Task 2: Supabase Setup (Manual Steps + Migration)

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create Supabase project**

1. Go to https://supabase.com → New project
2. Name it `partysnap`, choose a region close to you, set a database password
3. Wait for project to finish provisioning (~2 min)

- [ ] **Step 2: Copy credentials to .env.local**

In Supabase dashboard → Settings → API:
- Copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

Paste into `.env.local`.

- [ ] **Step 3: Write migration SQL**

Create `supabase/migrations/001_initial.sql`:
```sql
-- Events table
create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Uploads table
create table uploads (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_name text not null,
  file_path text not null,
  created_at timestamptz not null default now()
);

-- Enable Realtime on uploads
alter publication supabase_realtime add table uploads;

-- RLS on events
alter table events enable row level security;
create policy "Public read events"
  on events for select using (true);

-- RLS on uploads (guests can read and insert; service role deletes)
alter table uploads enable row level security;
create policy "Public read uploads"
  on uploads for select using (true);
create policy "Public insert uploads"
  on uploads for insert with check (true);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true);

-- Storage RLS
create policy "Public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "Anyone can upload photos"
  on storage.objects for insert
  with check (bucket_id = 'photos');
```

- [ ] **Step 4: Run migration in Supabase**

In Supabase dashboard → SQL Editor → New query → paste the contents of `001_initial.sql` → Run.

Expected: no errors. Check Table Editor to confirm `events` and `uploads` tables exist. Check Storage to confirm `photos` bucket exists.

- [ ] **Step 5: Commit**

```bash
git add supabase/ .env.example
git commit -m "feat: add DB migration and Supabase setup"
```

---

## Task 3: Supabase Client Helpers

**Files:**
- Create: `src/lib/supabase/types.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/service.ts`

- [ ] **Step 1: Write TypeScript types**

Create `src/lib/supabase/types.ts`:
```ts
export type Event = {
  id: string
  name: string
  code: string
  active: boolean
  created_at: string
}

export type Upload = {
  id: string
  event_id: string
  guest_name: string
  file_path: string
  created_at: string
}
```

- [ ] **Step 2: Write browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Write server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 4: Write service-role client**

Create `src/lib/supabase/service.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client helpers and types"
```

---

## Task 4: Slug Utility + Tests

**Files:**
- Create: `src/lib/slugify.ts`
- Create: `src/lib/slugify.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/slugify.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { slugify } from './slugify'

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Mike Birthday Party')).toBe('mike-birthday-party')
  })

  it('removes special characters', () => {
    expect(slugify("Mike's B-Day!!")).toBe('mikes-b-day')
  })

  it('collapses multiple spaces/hyphens', () => {
    expect(slugify('New   Year   Eve')).toBe('new-year-eve')
  })

  it('trims whitespace', () => {
    expect(slugify('  party  ')).toBe('party')
  })

  it('truncates to 50 characters', () => {
    expect(slugify('a'.repeat(60))).toHaveLength(50)
  })

  it('handles empty string', () => {
    expect(slugify('')).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: FAIL — `Cannot find module './slugify'`

- [ ] **Step 3: Implement slugify**

Create `src/lib/slugify.ts`:
```ts
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```
Expected: PASS — 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/slugify.ts src/lib/slugify.test.ts
git commit -m "feat: add slugify utility with tests"
```

---

## Task 5: Admin Auth Helpers

**Files:**
- Create: `src/lib/auth.ts`

- [ ] **Step 1: Write auth helpers**

Create `src/lib/auth.ts`:
```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'admin_session'
const COOKIE_VALUE = '1'

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value === COOKIE_VALUE
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect('/admin/login')
  }
}

export function makeAdminCookie() {
  return {
    name: COOKIE_NAME,
    value: COOKIE_VALUE,
    options: {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add admin auth cookie helpers"
```

---

## Task 6: Admin Login / Logout API Routes

**Files:**
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`

- [ ] **Step 1: Write login route**

Create `src/app/api/admin/login/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { makeAdminCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  const cookie = makeAdminCookie()
  res.cookies.set(cookie.name, cookie.value, cookie.options)
  return res
}
```

- [ ] **Step 2: Write logout route**

Create `src/app/api/admin/logout/route.ts`:
```ts
import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set('admin_session', '', { maxAge: 0, path: '/' })
  return res
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/
git commit -m "feat: add admin login/logout API routes"
```

---

## Task 7: Admin Login Page

**Files:**
- Create: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Write login page**

Create `src/app/admin/login/page.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Wrong password')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">PartySnap Admin</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Test manually**

Run `npm run dev`. Visit http://localhost:3000/admin/login. Enter wrong password — should show "Wrong password". Enter correct password (the value of `ADMIN_PASSWORD` in `.env.local`) — should redirect to /admin (404 for now).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/login/
git commit -m "feat: add admin login page"
```

---

## Task 8: Server Actions for Admin Mutations

**Files:**
- Create: `src/app/admin/actions.ts`

- [ ] **Step 1: Write server actions**

Create `src/app/admin/actions.ts`:
```ts
'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { slugify } from '@/lib/slugify'

export async function createEvent(formData: FormData) {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  if (!name) return
  const code = slugify(name)
  const supabase = createServiceClient()
  await supabase.from('events').insert({ name, code })
  revalidatePath('/admin')
}

export async function toggleEventActive(id: string, active: boolean) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('events').update({ active }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath(`/admin/events/${id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/actions.ts
git commit -m "feat: add admin server actions (createEvent, toggleEventActive)"
```

---

## Task 9: Admin Event List Page

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Write admin event list page**

Create `src/app/admin/page.tsx`:
```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { createEvent } from './actions'
import type { Event } from '@/lib/supabase/types'

type EventWithCount = Event & { uploads: { count: number }[] }

export default async function AdminPage() {
  await requireAdmin()

  const supabase = createServiceClient()
  const { data: events } = await supabase
    .from('events')
    .select('*, uploads(count)')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">PartySnap Admin</h1>
        <form action={async () => {
          'use server'
          const { cookies } = await import('next/headers')
          const cookieStore = await cookies()
          cookieStore.set('admin_session', '', { maxAge: 0, path: '/' })
          redirect('/admin/login')
        }}>
          <button type="submit" className="text-sm text-gray-400 hover:text-white">
            Log out
          </button>
        </form>
      </div>

      <form action={createEvent} className="flex gap-2 mb-8">
        <input
          name="name"
          placeholder="Event name, e.g. Mike's Birthday"
          required
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition"
        >
          + Create Event
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {(events as EventWithCount[] | null)?.map((event) => (
          <Link
            key={event.id}
            href={`/admin/events/${event.id}`}
            className="flex items-center justify-between p-4 bg-gray-900 rounded-xl hover:bg-gray-800 transition"
          >
            <div>
              <p className="font-semibold">{event.name}</p>
              <p className="text-sm text-gray-400">
                /{event.code} · {event.uploads[0]?.count ?? 0} photos
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
              {event.active ? 'Active' : 'Inactive'}
            </span>
          </Link>
        ))}
        {(!events || events.length === 0) && (
          <p className="text-gray-500 text-center py-8">No events yet. Create one above.</p>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Test manually**

Visit http://localhost:3000/admin. Should redirect to /admin/login if not authenticated. After login, should show event list and create form. Create a test event — should appear in list with the slugified code.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add admin event list page"
```

---

## Task 10: QRCode Component

**Files:**
- Create: `src/components/QRCode.tsx`

- [ ] **Step 1: Write QRCode component**

Create `src/components/QRCode.tsx`:
```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QRCode.tsx
git commit -m "feat: add QRCode component with download"
```

---

## Task 11: Delete Photo API Route

**Files:**
- Create: `src/app/api/events/[id]/photos/[uploadId]/route.ts`

- [ ] **Step 1: Write delete route**

Create `src/app/api/events/[id]/photos/[uploadId]/route.ts`:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: eventId, uploadId } = await params
  const supabase = createServiceClient()

  const { data: upload } = await supabase
    .from('uploads')
    .select('file_path')
    .eq('id', uploadId)
    .eq('event_id', eventId)
    .single()

  if (!upload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await supabase.storage.from('photos').remove([upload.file_path])
  await supabase.from('uploads').delete().eq('id', uploadId)

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/events/
git commit -m "feat: add delete photo API route"
```

---

## Task 12: AdminPhotoGrid Component

**Files:**
- Create: `src/components/AdminPhotoGrid.tsx`

- [ ] **Step 1: Write AdminPhotoGrid**

Create `src/components/AdminPhotoGrid.tsx`:
```tsx
'use client'
import { useState } from 'react'

type Photo = {
  id: string
  guest_name: string
  publicUrl: string
  event_id: string
}

export function AdminPhotoGrid({
  eventId,
  photos: initialPhotos,
}: {
  eventId: string
  photos: Photo[]
}) {
  const [photos, setPhotos] = useState(initialPhotos)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function deletePhoto(uploadId: string) {
    setDeleting(uploadId)
    const res = await fetch(`/api/events/${eventId}/photos/${uploadId}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== uploadId))
    }
    setDeleting(null)
  }

  async function downloadAll() {
    setDownloading(true)
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    await Promise.all(
      photos.map(async (photo) => {
        const res = await fetch(photo.publicUrl)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] || 'jpg'
        zip.file(`${photo.guest_name}-${photo.id.slice(0, 8)}.${ext}`, blob)
      })
    )
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'party-photos.zip'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-gray-400">{photos.length} photos</p>
        {photos.length > 0 && (
          <button
            onClick={downloadAll}
            disabled={downloading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
          >
            {downloading ? 'Zipping…' : `⬇ Download All`}
          </button>
        )}
      </div>

      {photos.length === 0 && (
        <p className="text-gray-500 text-center py-12">No photos yet.</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <div key={photo.id} className="relative group aspect-square">
            <img
              src={photo.publicUrl}
              alt={photo.guest_name}
              className="w-full h-full object-cover rounded-lg"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition rounded-lg flex flex-col items-center justify-center gap-2">
              <p className="text-white text-xs font-medium">{photo.guest_name}</p>
              <button
                onClick={() => deletePhoto(photo.id)}
                disabled={deleting === photo.id}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs rounded-lg"
              >
                {deleting === photo.id ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminPhotoGrid.tsx
git commit -m "feat: add AdminPhotoGrid with delete and download all"
```

---

## Task 13: Admin Event Detail Page

**Files:**
- Create: `src/app/admin/events/[id]/page.tsx`

- [ ] **Step 1: Write event detail page**

Create `src/app/admin/events/[id]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { toggleEventActive } from '../../actions'
import { QRCode } from '@/components/QRCode'
import { AdminPhotoGrid } from '@/components/AdminPhotoGrid'
import type { Upload } from '@/lib/supabase/types'

export default async function AdminEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdmin()

  const { id } = await params
  const supabase = createServiceClient()

  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (!event) notFound()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: false })

  const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/${event.code}`

  const photos = (uploads ?? []).map((u: Upload) => ({
    id: u.id,
    guest_name: u.guest_name,
    event_id: u.event_id,
    publicUrl: supabase.storage.from('photos').getPublicUrl(u.file_path).data.publicUrl,
  }))

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-gray-400 hover:text-white">← Events</Link>
        <h1 className="text-2xl font-bold">{event.name}</h1>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <span className={`text-xs px-2 py-1 rounded-full ${event.active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
          {event.active ? 'Active' : 'Inactive'}
        </span>
        <form action={toggleEventActive.bind(null, event.id, !event.active)}>
          <button type="submit" className="text-sm text-indigo-400 hover:text-indigo-300">
            {event.active ? 'Deactivate event' : 'Activate event'}
          </button>
        </form>
      </div>

      <div className="bg-gray-900 rounded-2xl p-6 mb-6 flex flex-col items-center">
        <p className="text-sm text-gray-400 mb-4">Print this QR code and put it at the party</p>
        <QRCode url={eventUrl} />
      </div>

      <div className="bg-gray-900 rounded-2xl p-6">
        <AdminPhotoGrid eventId={event.id} photos={photos} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Add NEXT_PUBLIC_APP_URL to .env.local**

Add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
(Update to your Vercel URL after deploy)

Also add to `.env.example`:
```bash
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

- [ ] **Step 3: Test manually**

Create a test event in /admin. Click it → should show event detail page with QR code pointing to `http://localhost:3000/[code]`. Toggle active/inactive — status should update. QR download should save a PNG.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/events/ .env.example
git commit -m "feat: add admin event detail page with QR and photo management"
```

---

## Task 14: Guest Name Entry Page

**Files:**
- Create: `src/app/[eventCode]/page.tsx`

- [ ] **Step 1: Write guest name entry page**

Create `src/app/[eventCode]/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NameEntryForm } from './NameEntryForm'

export default async function EventPage({
  params,
}: {
  params: Promise<{ eventCode: string }>
}) {
  const { eventCode } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, code, active')
    .eq('code', eventCode)
    .single()

  if (!event) notFound()

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">{event.name}</h1>

        {!event.active ? (
          <p className="text-gray-400 mt-4">This event has ended.</p>
        ) : (
          <>
            <p className="text-gray-400 mb-6">Share your photos with everyone!</p>
            <NameEntryForm eventCode={event.code} />
          </>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Create NameEntryForm client component**

Create `src/app/[eventCode]/NameEntryForm.tsx`:
```tsx
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
```

- [ ] **Step 3: Test manually**

Visit http://localhost:3000/[your-test-event-code]. Should show event name and name entry form. Enter a name → should redirect to /[eventCode]/gallery (404 for now). Visit a non-existent code → should show Next.js 404 page.

- [ ] **Step 4: Commit**

```bash
git add src/app/[eventCode]/
git commit -m "feat: add guest name entry page"
```

---

## Task 15: UploadButton Component

**Files:**
- Create: `src/components/UploadButton.tsx`

- [ ] **Step 1: Write UploadButton**

Create `src/components/UploadButton.tsx`:
```tsx
'use client'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const MAX_SIZE = 10 * 1024 * 1024

export function UploadButton({
  eventId,
  guestName,
}: {
  eventId: string
  guestName: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_SIZE) {
      setError('Photo must be under 10MB')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setUploading(true)
    setError(null)

    try {
      const id = crypto.randomUUID()
      const filePath = `${eventId}/${id}`
      const supabase = createClient()

      const { error: storageError } = await supabase.storage
        .from('photos')
        .upload(filePath, file)

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('uploads')
        .insert({ id, event_id: eventId, guest_name: guestName, file_path: filePath })

      if (dbError) throw dbError
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-lg"
      >
        {uploading ? 'Uploading…' : '📷 Upload Photo'}
      </button>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/UploadButton.tsx
git commit -m "feat: add UploadButton component with 10MB limit"
```

---

## Task 16: GalleryClient Component (Realtime)

**Files:**
- Create: `src/app/[eventCode]/gallery/GalleryClient.tsx`

- [ ] **Step 1: Write GalleryClient**

Create `src/app/[eventCode]/gallery/GalleryClient.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UploadButton } from '@/components/UploadButton'
import type { Upload } from '@/lib/supabase/types'

type Photo = Upload & { publicUrl: string }

export function GalleryClient({
  eventId,
  eventName,
  initialPhotos,
  guestName,
}: {
  eventId: string
  eventName: string
  initialPhotos: Photo[]
  guestName: string
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos)

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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  const uploaderCount = new Set(photos.map((p) => p.guest_name)).size

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="sticky top-0 bg-gray-950/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold">{eventName}</h1>
          <p className="text-xs text-green-400">
            ● Live — {photos.length} photos · {uploaderCount} uploaders
          </p>
        </div>
        <UploadButton eventId={eventId} guestName={guestName} />
      </div>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <p className="text-gray-500">No photos yet — be the first!</p>
          <UploadButton eventId={eventId} guestName={guestName} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {photos.map((photo) => (
            <div key={photo.id} className="relative aspect-square group">
              <img
                src={photo.publicUrl}
                alt={photo.guest_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 group-hover:opacity-100 transition">
                <p className="text-white text-xs truncate">{photo.guest_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/[eventCode]/gallery/GalleryClient.tsx
git commit -m "feat: add GalleryClient with Supabase Realtime subscription"
```

---

## Task 17: Live Gallery Page

**Files:**
- Create: `src/app/[eventCode]/gallery/page.tsx`

- [ ] **Step 1: Write gallery page**

Create `src/app/[eventCode]/gallery/page.tsx`:
```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GalleryClient } from './GalleryClient'
import { GuestNameLoader } from './GuestNameLoader'
import type { Upload } from '@/lib/supabase/types'

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventCode: string }>
}) {
  const { eventCode } = await params
  const supabase = await createClient()

  const { data: event } = await supabase
    .from('events')
    .select('id, name, code, active')
    .eq('code', eventCode)
    .single()

  if (!event) notFound()

  const { data: uploads } = await supabase
    .from('uploads')
    .select('*')
    .eq('event_id', event.id)
    .order('created_at', { ascending: false })

  const initialPhotos = (uploads ?? []).map((u: Upload) => ({
    ...u,
    publicUrl: supabase.storage.from('photos').getPublicUrl(u.file_path).data.publicUrl,
  }))

  return (
    <GuestNameLoader eventCode={eventCode}>
      {(guestName) => (
        <GalleryClient
          eventId={event.id}
          eventName={event.name}
          initialPhotos={initialPhotos}
          guestName={guestName}
        />
      )}
    </GuestNameLoader>
  )
}
```

- [ ] **Step 2: Create GuestNameLoader**

The gallery page is a server component, but it needs to read `localStorage` (client-only). Create a client wrapper that reads the name and redirects if missing.

Create `src/app/[eventCode]/gallery/GuestNameLoader.tsx`:
```tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function GuestNameLoader({
  eventCode,
  children,
}: {
  eventCode: string
  children: (guestName: string) => React.ReactNode
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

  return <>{children(guestName)}</>
}
```

- [ ] **Step 3: Test manually**

Full guest flow test:
1. Open a new incognito window
2. Visit http://localhost:3000/[test-event-code]
3. Enter a name → should redirect to gallery
4. Click Upload Photo → pick an image → should appear in grid
5. Open another incognito window, visit same gallery URL, enter different name → photo from first window should already be there
6. Upload from second window → first window should show new photo within ~1 second (Realtime)

- [ ] **Step 4: Commit**

```bash
git add src/app/[eventCode]/gallery/
git commit -m "feat: add live gallery page with GuestNameLoader"
```

---

## Task 18: Root Page + Root Layout

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update root page to redirect**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/admin')
}
```

- [ ] **Step 2: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PartySnap',
  description: 'Share party photos instantly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/layout.tsx
git commit -m "feat: update root layout and redirect root to /admin"
```

---

## Task 19: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/partysnap.git
git push -u origin main
```

- [ ] **Step 2: Deploy on Vercel**

1. Go to https://vercel.com → New Project → Import from GitHub → select `partysnap`
2. Framework: Next.js (auto-detected)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_APP_URL` = your Vercel URL (e.g. `https://partysnap.vercel.app`)
4. Deploy

- [ ] **Step 3: Update NEXT_PUBLIC_APP_URL**

After Vercel assigns a URL, update `NEXT_PUBLIC_APP_URL` in Vercel environment variables → redeploy.

- [ ] **Step 4: Full production smoke test**

| Test | Expected |
|------|----------|
| Visit /admin on phone | Redirect to /admin/login |
| Login with ADMIN_PASSWORD | Redirect to /admin |
| Create event "Test Party" | Event appears with code `test-party` |
| Click event → QR code | QR renders, links to correct URL |
| Download QR PNG | PNG saves |
| Scan QR on phone | Opens name entry page |
| Enter name → Join | Redirects to gallery |
| Upload photo from camera roll (iOS Safari) | Photo appears in gallery |
| Upload photo from camera roll (Android Chrome) | Photo appears in gallery |
| Open gallery on another device | First photo visible |
| Upload from second device | Appears on first device in <2 sec |
| Admin: delete a photo | Disappears from all gallery views |
| Admin: Download All | ZIP downloads with all photos |
| Admin: Deactivate event | Name entry page shows "event ended" |
| Try uploading >10MB file | Error shown, no upload |

---

## Manual Test Checklist (Local Dev)

Before deploy, run through this in local dev with two browser windows:

- [ ] Login flow works (wrong password → error, correct → redirect)
- [ ] Create event → slug generated correctly
- [ ] QR code renders and points to correct URL
- [ ] Guest name saves to localStorage, used in gallery
- [ ] Inactive event shows "event ended" on name entry page
- [ ] Unknown event code → 404
- [ ] Upload appears in same window immediately
- [ ] Upload appears in second window via Realtime
- [ ] Admin delete removes from gallery Realtime
- [ ] Files >10MB rejected client-side
- [ ] Download All produces valid ZIP with correct filenames
