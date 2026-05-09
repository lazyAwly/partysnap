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
