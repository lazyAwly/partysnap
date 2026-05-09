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
