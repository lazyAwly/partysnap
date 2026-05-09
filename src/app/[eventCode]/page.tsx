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
