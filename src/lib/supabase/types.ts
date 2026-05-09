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
