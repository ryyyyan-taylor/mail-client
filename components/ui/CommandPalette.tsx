"use client"

import { useEffect, useState, useRef } from "react"
import { useUIStore } from "@/lib/store/uiStore"
import { bindings, type KeyBinding } from "@/lib/keybinds/bindings"

function formatKey(key: string): string {
  return key
    .replace("Shift+", "")
    .replace(/\b(\w)/g, (_, c) => c.toUpperCase())
    .replace("g ", "g ")
}

function GroupedBindings({ title, items }: { title: string; items: KeyBinding[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h3 className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      <div className="space-y-0.5">
        {items.map((b) => (
          <div key={b.key + b.mode} className="flex items-center justify-between rounded px-2 py-1 hover:bg-neutral-800/50">
            <span className="text-sm text-neutral-300">{b.description}</span>
            <kbd className="ml-4 rounded bg-neutral-800 px-1.5 py-0.5 text-xs font-mono text-neutral-400">
              {formatKey(b.key)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen)
  const [filter, setFilter] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setFilter("")
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  function close() {
    useUIStore.getState().setCommandPaletteOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  if (!open) return null

  const lowerFilter = filter.toLowerCase()
  const filtered = bindings.filter(
    (b) =>
      b.description.toLowerCase().includes(lowerFilter) ||
      b.key.toLowerCase().includes(lowerFilter)
  )

  const normalNav = filtered.filter((b) => b.mode === "NORMAL" && ["cursorDown", "cursorUp", "jumpTop", "jumpBottom", "openThread", "goInbox", "goStarred", "goSent", "goDrafts", "goAllMail", "goSpam", "goTrash"].includes(b.action))
  const normalActions = filtered.filter((b) => b.mode === "NORMAL" && ["archive", "trash", "spam", "toggleStar", "toggleUnread", "search", "labelPicker", "visualToggle", "mute"].includes(b.action))
  const visual = filtered.filter((b) => b.mode === "VISUAL")
  const other = filtered.filter((b) => b.mode === "ALL")

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={close}>
      <div
        className="w-96 rounded-lg bg-neutral-900 shadow-xl border border-neutral-700"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="p-3 border-b border-neutral-800">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter keybinds..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none"
          />
        </div>
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          <GroupedBindings title="Navigation" items={normalNav} />
          <GroupedBindings title="Actions" items={normalActions} />
          <GroupedBindings title="Visual Mode" items={visual} />
          <GroupedBindings title="General" items={other} />
          {filtered.length === 0 && (
            <p className="text-sm text-neutral-500 text-center py-4">No matching keybinds</p>
          )}
        </div>
      </div>
    </div>
  )
}
