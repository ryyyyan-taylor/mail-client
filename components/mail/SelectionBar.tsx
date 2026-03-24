"use client"

import { useMailStore } from "@/lib/store/mailStore"
import { useUIStore } from "@/lib/store/uiStore"
import { useBulkActions } from "@/hooks/useBulkActions"

export function SelectionBar() {
  const selectedIds = useMailStore((s) => s.selectedIds)
  const mode = useUIStore((s) => s.mode)
  const actions = useBulkActions()

  if (mode !== "VISUAL" || selectedIds.size === 0) return null

  const ids = Array.from(selectedIds)

  /** Destructive: exit visual, clear selection, then act */
  function actDestructive(fn: (ids: string[]) => void) {
    useMailStore.getState().clearSelection()
    useUIStore.getState().setMode("NORMAL")
    fn(ids)
  }

  /** Non-destructive: keep selection, just act */
  function actNonDestructive(fn: (ids: string[]) => void) {
    fn(ids)
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-neutral-800 px-4 py-2 shadow-lg">
      <span className="text-sm text-neutral-300">
        {selectedIds.size} selected
      </span>
      <div className="h-4 w-px bg-neutral-600" />
      <button
        onClick={() => actDestructive(actions.archive)}
        className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Archive <kbd className="ml-1 text-neutral-500">e</kbd>
      </button>
      <button
        onClick={() => actDestructive(actions.trash)}
        className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Trash <kbd className="ml-1 text-neutral-500">d</kbd>
      </button>
      <button
        onClick={() => actDestructive(actions.spam)}
        className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Spam <kbd className="ml-1 text-neutral-500">x</kbd>
      </button>
      <button
        onClick={() => actNonDestructive(actions.toggleStar)}
        className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Star <kbd className="ml-1 text-neutral-500">s</kbd>
      </button>
      <button
        onClick={() => actNonDestructive(actions.toggleUnread)}
        className="rounded px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Read/Unread <kbd className="ml-1 text-neutral-500">y</kbd>
      </button>
    </div>
  )
}
