'use client'
import { useActionState } from 'react'
import { createEvent } from './actions'

export function CreateEventForm() {
  const [state, formAction, pending] = useActionState(createEvent, { error: null })

  return (
    <div className="mb-8">
      <form action={formAction} className="flex gap-2">
        <input
          name="name"
          placeholder="Event name, e.g. Mike's Birthday"
          required
          className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-700 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
        >
          {pending ? 'Creating…' : '+ Create Event'}
        </button>
      </form>
      {state.error && (
        <p className="text-red-400 bg-red-950/50 border border-red-900 rounded-lg px-4 py-3 mt-3">
          Failed to create event: {state.error}
        </p>
      )}
    </div>
  )
}
