import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; uploadId: string }> }
) {
  const adminUser = await isAdmin()
  const guestName = req.headers.get('x-guest-name')

  if (!adminUser && !guestName) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: eventId, uploadId } = await params
  const supabase = createServiceClient()

  const { data: upload } = await supabase
    .from('uploads')
    .select('file_path, guest_name')
    .eq('id', uploadId)
    .eq('event_id', eventId)
    .single()

  if (!upload) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!adminUser && upload.guest_name !== guestName) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.storage.from('photos').remove([upload.file_path])
  await supabase.from('uploads').delete().eq('id', uploadId)

  return NextResponse.json({ ok: true })
}
