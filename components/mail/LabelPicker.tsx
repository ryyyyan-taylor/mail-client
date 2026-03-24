"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useUIStore } from "@/lib/store/uiStore"
import { useMailStore } from "@/lib/store/mailStore"
import { useLabels } from "@/hooks/useLabels"
import { useToastStore } from "@/lib/store/toastStore"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import { useParams } from "next/navigation"

const HIDDEN_IDS = new Set([
  "INBOX", "STARRED", "SENT", "DRAFT", "SPAM", "TRASH",
  "UNREAD", "IMPORTANT", "CHAT", "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
])

export function LabelPicker() {
  const open = useUIStore((s) => s.labelPickerOpen)
  const targetIds = useUIStore((s) => s.labelPickerTargetIds)
  const { data } = useLabels()
  const queryClient = useQueryClient()
  const params = useParams<{ label: string }>()
  const label = decodeURIComponent(params.label)

  const [filter, setFilter] = useState("")
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Refs so the capture-phase listener can read current state
  const filterRef = useRef(filter)
  filterRef.current = filter
  const cursorRef = useRef(cursor)
  cursorRef.current = cursor

  const allLabels = (data?.labels ?? [])
    .filter((l) => !HIDDEN_IDS.has(l.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const filtered = allLabels.filter((l) =>
    l.name.toLowerCase().includes(filter.toLowerCase())
  )
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered

  const targetIdsRef = useRef(targetIds)
  targetIdsRef.current = targetIds
  const labelRef = useRef(label)
  labelRef.current = label

  useEffect(() => {
    if (open) {
      setFilter("")
      setCursor(0)
    }
  }, [open])

  useEffect(() => {
    setCursor(0)
  }, [filter])

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[cursor] as HTMLElement | undefined
    if (item) item.scrollIntoView({ block: "nearest" })
  }, [cursor])

  const close = useCallback(() => {
    useUIStore.getState().setLabelPickerOpen(false)
    useUIStore.getState().setLabelPickerTargetIds([])
    // Exit visual mode if active
    if (useUIStore.getState().mode === "VISUAL") {
      useMailStore.getState().clearSelection()
      useUIStore.getState().setMode("NORMAL")
    }
  }, [])

  const applyLabel = useCallback(async (labelId: string, labelName: string) => {
    const ids = targetIdsRef.current
    const currentLabel = labelRef.current
    close()
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/gmail/threads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              addLabelIds: [labelId],
              removeLabelIds: ["INBOX"],
            }),
          }).then((r) => {
            if (!r.ok) throw new Error("Failed")
          })
        )
      )
      useToastStore.getState().addToast(
        `Labeled "${labelName}" — ${ids.length} thread${ids.length > 1 ? "s" : ""}`
      )
    } catch {
      useToastStore.getState().addToast("Failed to apply label", "error")
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.messages(currentLabel) })
  }, [close, queryClient])

  // Single capture-phase listener handles ALL keyboard interaction and blocks tinykeys
  useEffect(() => {
    if (!open) return

    function handleKey(e: KeyboardEvent) {
      // Block everything from reaching tinykeys
      e.stopPropagation()

      const inputFocused = document.activeElement === inputRef.current
      const hasFilter = filterRef.current.length > 0
      const items = filteredRef.current

      if (e.key === "Escape") {
        e.preventDefault()
        close()
        return
      }

      if (e.key === "Enter") {
        e.preventDefault()
        const selected = items[cursorRef.current]
        if (selected) applyLabel(selected.id, selected.name)
        return
      }

      // Arrow keys always navigate
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setCursor((c) => Math.min(c + 1, items.length - 1))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setCursor((c) => Math.max(c - 1, 0))
        return
      }

      // j/k navigate when not actively filtering
      if (e.key === "j" && (!inputFocused || !hasFilter)) {
        e.preventDefault()
        setCursor((c) => Math.min(c + 1, items.length - 1))
        return
      }
      if (e.key === "k" && (!inputFocused || !hasFilter)) {
        e.preventDefault()
        setCursor((c) => Math.max(c - 1, 0))
        return
      }

      // Any other printable key: focus input and let it type
      if (e.key.length === 1 && !inputFocused) {
        inputRef.current?.focus()
      }
      // Don't prevent default — let the input receive the keystroke
    }

    window.addEventListener("keydown", handleKey, true)
    return () => window.removeEventListener("keydown", handleKey, true)
  }, [open, close, applyLabel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={close}>
      <div
        className="w-72 rounded-lg bg-neutral-900 shadow-xl border border-neutral-700 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter labels..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-500 outline-none"
          />
        </div>
        <div ref={listRef} className="max-h-64 overflow-y-auto px-1 pb-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500">No labels found</div>
          ) : (
            filtered.map((l, i) => (
              <button
                key={l.id}
                onClick={() => applyLabel(l.id, l.name)}
                className={`flex w-full items-center rounded px-3 py-1.5 text-sm text-left transition-colors ${
                  i === cursor
                    ? "bg-blue-900/60 text-white"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {l.name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
