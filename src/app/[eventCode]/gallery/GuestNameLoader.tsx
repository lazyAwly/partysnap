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
