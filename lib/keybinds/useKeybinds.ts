"use client"

import { useEffect, type RefObject } from "react"
// @ts-expect-error — tinykeys types don't resolve under "exports" in package.json
import { tinykeys } from "tinykeys"
import { useRouter, useParams } from "next/navigation"
import { useMailStore } from "@/lib/store/mailStore"
import { useUIStore } from "@/lib/store/uiStore"

const SCROLL_STEP = 80

interface BulkActions {
  archive: (ids: string[]) => void
  trash: (ids: string[]) => void
  spam: (ids: string[]) => void
  toggleStar: (ids: string[]) => void
  toggleUnread: (ids: string[]) => void
  undo: () => void
}

interface UseKeybindsOpts {
  threadCount: number
  getThreadId: (index: number) => string | undefined
  detailScrollRef: RefObject<HTMLDivElement | null>
  actions: BulkActions
}

export function useKeybinds({ threadCount, getThreadId, detailScrollRef, actions }: UseKeybindsOpts) {
  const router = useRouter()
  const params = useParams<{ label: string }>()

  useEffect(() => {
    const clamp = (n: number) => Math.max(0, Math.min(n, threadCount - 1))

    function scrollDetail(dx: number, dy: number) {
      const el = detailScrollRef.current
      if (!el) return
      el.scrollBy({ top: dy, left: dx })
    }

    /** Get IDs to act on: selected IDs in VISUAL mode, or cursor thread in NORMAL */
    function getActionIds(): string[] {
      const { mode } = useUIStore.getState()
      if (mode === "VISUAL") {
        const ids = Array.from(useMailStore.getState().selectedIds)
        return ids.length > 0 ? ids : []
      }
      const id = getThreadId(useMailStore.getState().cursorIndex)
      return id ? [id] : []
    }

    /** After a bulk action in VISUAL mode, exit back to NORMAL */
    function exitVisualAfterAction() {
      if (useUIStore.getState().mode === "VISUAL") {
        useMailStore.getState().clearSelection()
        useUIStore.getState().setMode("NORMAL")
      }
    }

    /** Compute selected IDs between anchor and cursor (inclusive) */
    function computeSelectionRange(newCursorIndex: number): string[] {
      const anchor = useMailStore.getState().selectionAnchor
      if (anchor === null) return []
      const lo = Math.min(anchor, newCursorIndex)
      const hi = Math.max(anchor, newCursorIndex)
      const ids: string[] = []
      for (let i = lo; i <= hi; i++) {
        const id = getThreadId(i)
        if (id) ids.push(id)
      }
      return ids
    }

    const handlers: Record<string, (e: KeyboardEvent) => void> = {
      j(e) {
        const { mode } = useUIStore.getState()
        if (mode === "VISUAL") {
          e.preventDefault()
          const next = clamp(useMailStore.getState().cursorIndex + 1)
          const ids = computeSelectionRange(next)
          useMailStore.getState().extendSelection(ids, next)
          return
        }
        if (mode !== "NORMAL") return
        e.preventDefault()
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "DETAIL") {
          scrollDetail(0, SCROLL_STEP)
        } else {
          const next = clamp(useMailStore.getState().cursorIndex + 1)
          useMailStore.getState().setCursor(next)
        }
      },
      k(e) {
        const { mode } = useUIStore.getState()
        if (mode === "VISUAL") {
          e.preventDefault()
          const next = clamp(useMailStore.getState().cursorIndex - 1)
          const ids = computeSelectionRange(next)
          useMailStore.getState().extendSelection(ids, next)
          return
        }
        if (mode !== "NORMAL") return
        e.preventDefault()
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "DETAIL") {
          scrollDetail(0, -SCROLL_STEP)
        } else {
          const next = clamp(useMailStore.getState().cursorIndex - 1)
          useMailStore.getState().setCursor(next)
        }
      },
      h(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "DETAIL") {
          e.preventDefault()
          scrollDetail(-SCROLL_STEP, 0)
        }
      },
      l(e) {
        const { mode, focusedPane } = useUIStore.getState()
        // In VISUAL mode, open label picker
        if (mode === "VISUAL") {
          const ids = getActionIds()
          if (ids.length === 0) return
          e.preventDefault()
          useUIStore.getState().setLabelPickerTargetIds(ids)
          useUIStore.getState().setLabelPickerOpen(true)
          return
        }
        if (mode !== "NORMAL") return
        if (focusedPane === "DETAIL") {
          // Scroll detail pane horizontally
          e.preventDefault()
          scrollDetail(SCROLL_STEP, 0)
        } else {
          // Open label picker for cursor thread
          const id = getThreadId(useMailStore.getState().cursorIndex)
          if (!id) return
          e.preventDefault()
          useUIStore.getState().setLabelPickerTargetIds([id])
          useUIStore.getState().setLabelPickerOpen(true)
        }
      },
      "g g"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "DETAIL") {
          const el = detailScrollRef.current
          if (el) el.scrollTop = 0
        } else {
          useMailStore.getState().setCursor(0)
        }
      },
      G(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "DETAIL") {
          const el = detailScrollRef.current
          if (el) el.scrollTop = el.scrollHeight
        } else {
          useMailStore.getState().setCursor(threadCount - 1)
        }
      },
      Enter(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        const { focusedPane } = useUIStore.getState()
        if (focusedPane === "LIST") {
          const idx = useMailStore.getState().cursorIndex
          const id = getThreadId(idx)
          if (!id) return
          e.preventDefault()
          useMailStore.getState().setActiveThread(id)
          useUIStore.getState().setFocusedPane("DETAIL")
        }
      },
      Escape(e) {
        const { mode, focusedPane } = useUIStore.getState()
        e.preventDefault()
        if (mode === "VISUAL") {
          // Move cursor to the top of the selection range before clearing
          const anchor = useMailStore.getState().selectionAnchor
          const cursor = useMailStore.getState().cursorIndex
          if (anchor !== null) {
            useMailStore.getState().setCursor(Math.min(anchor, cursor))
          }
          useMailStore.getState().clearSelection()
          useUIStore.getState().setMode("NORMAL")
        } else if (mode === "INSERT") {
          useUIStore.getState().setMode("NORMAL")
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
          }
        } else if (focusedPane === "DETAIL") {
          useUIStore.getState().setFocusedPane("LIST")
        }
      },

      // V — enter/exit VISUAL mode
      V(e) {
        const { mode } = useUIStore.getState()
        if (mode === "INSERT") return
        e.preventDefault()
        if (mode === "VISUAL") {
          useMailStore.getState().clearSelection()
          useUIStore.getState().setMode("NORMAL")
        } else {
          // Enter VISUAL: focus list pane, set anchor, select cursor row
          useUIStore.getState().setFocusedPane("LIST")
          useMailStore.getState().enterVisualMode()
          const idx = useMailStore.getState().cursorIndex
          const id = getThreadId(idx)
          if (id) {
            useMailStore.getState().extendSelection([id], idx)
          }
          useUIStore.getState().setMode("VISUAL")
        }
      },

      // [ / ] — prev/next thread (works from either pane)
      "["(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (!useMailStore.getState().activeThreadId) return
        e.preventDefault()
        const cursor = useMailStore.getState().cursorIndex
        if (cursor <= 0) return
        const prevIndex = cursor - 1
        const prevId = getThreadId(prevIndex)
        if (!prevId) return
        useMailStore.getState().setCursor(prevIndex)
        useMailStore.getState().setActiveThread(prevId)
      },
      "]"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (!useMailStore.getState().activeThreadId) return
        e.preventDefault()
        const cursor = useMailStore.getState().cursorIndex
        if (cursor >= threadCount - 1) return
        const nextIndex = cursor + 1
        const nextId = getThreadId(nextIndex)
        if (!nextId) return
        useMailStore.getState().setCursor(nextIndex)
        useMailStore.getState().setActiveThread(nextId)
      },

      // --- Actions (work in NORMAL on cursor, or VISUAL on selection) ---
      // Destructive actions: exit VISUAL after action
      e(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.archive(ids)
      },
      d(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.trash(ids)
      },
      x(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.spam(ids)
      },
      // Non-destructive actions: keep selection in VISUAL mode
      s(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        actions.toggleStar(ids)
      },
      y(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        actions.toggleUnread(ids)
      },
      u(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL") return
        e.preventDefault()
        actions.undo()
      },

      // --- Mute thread (remove INBOX, add muted label-like behavior) ---
      m(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        if (mode === "VISUAL") {
          exitVisualAfterAction()
        }
        actions.archive(ids) // mute = archive (removes from inbox)
      },

      // --- Command palette ---
      p(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useUIStore.getState().setCommandPaletteOpen(true)
      },

      // --- Search ---
      "/"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        const ref = (window as unknown as Record<string, unknown>).__searchInputRef as
          | { current: HTMLInputElement | null }
          | undefined
        if (ref?.current) {
          ref.current.focus()
          ref.current.select()
        }
      },

      // --- g-prefix label navigation ---
      "g i"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/INBOX")
      },
      "g s"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/STARRED")
      },
      "g t"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/SENT")
      },
      "g d"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/DRAFT")
      },
      "g e"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/ALL")
      },
      "g x"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/SPAM")
      },
      "g r"(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useMailStore.getState().setCursor(0)
        useMailStore.getState().setActiveThread(null)
        useUIStore.getState().setFocusedPane("LIST")
        router.push("/TRASH")
      },
    }

    const unsubscribe = tinykeys(window, handlers)
    return () => unsubscribe()
  }, [threadCount, getThreadId, router, params.label, detailScrollRef, actions])
}
