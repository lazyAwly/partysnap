'use server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { slugify } from '@/lib/slugify'

export async function createEvent(_prevState: { error: string | null }, formData: FormData) {
  await requireAdmin()
  const name = (formData.get('name') as string).trim()
  if (!name) return { error: null }
  const code = slugify(name)
  const supabase = createServiceClient()
  const { error } = await supabase.from('events').insert({ name, code })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { error: null }
}

export async function toggleEventActive(id: string, active: boolean) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('events').update({ active }).eq('id', id)
  revalidatePath('/admin')
  revalidatePath(`/admin/events/${id}`)
}
