"use client"

import { useEffect, type RefObject } from "react"
// @ts-expect-error — tinykeys types don't resolve under "exports" in package.json
import { tinykeys } from "tinykeys"
import { useRouter, useParams } from "next/navigation"
import { useMailStore } from "@/lib/store/mailStore"
import { useUIStore } from "@/lib/store/uiStore"
import { useKeybindStore, getEffectiveBindings } from "@/lib/store/keybindStore"

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
  const overridesKey = useKeybindStore((s) => JSON.stringify(s.overrides))

  useEffect(() => {
    const clamp = (n: number) => Math.max(0, Math.min(n, threadCount - 1))

    function scrollDetail(dx: number, dy: number) {
      const el = detailScrollRef.current
      if (!el) return
      el.scrollBy({ top: dy, left: dx })
    }

    function getActionIds(): string[] {
      const { mode } = useUIStore.getState()
      if (mode === "VISUAL") {
        const ids = Array.from(useMailStore.getState().selectedIds)
        return ids.length > 0 ? ids : []
      }
      const id = getThreadId(useMailStore.getState().cursorIndex)
      return id ? [id] : []
    }

    function exitVisualAfterAction() {
      if (useUIStore.getState().mode === "VISUAL") {
        useMailStore.getState().clearSelection()
        useUIStore.getState().setMode("NORMAL")
      }
    }

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

    function goToLabel(path: string) {
      useMailStore.getState().setCursor(0)
      useMailStore.getState().setActiveThread(null)
      useUIStore.getState().setFocusedPane("LIST")
      router.push(path)
    }

    // Map action names to handler functions
    const actionHandlers: Record<string, (e: KeyboardEvent) => void> = {
      cursorDown(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        if (useUIStore.getState().focusedPane === "DETAIL") {
          scrollDetail(0, SCROLL_STEP)
        } else {
          useMailStore.getState().setCursor(clamp(useMailStore.getState().cursorIndex + 1))
        }
      },
      cursorUp(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        if (useUIStore.getState().focusedPane === "DETAIL") {
          scrollDetail(0, -SCROLL_STEP)
        } else {
          useMailStore.getState().setCursor(clamp(useMailStore.getState().cursorIndex - 1))
        }
      },
      jumpTop(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        if (useUIStore.getState().focusedPane === "DETAIL") {
          const el = detailScrollRef.current
          if (el) el.scrollTop = 0
        } else {
          useMailStore.getState().setCursor(0)
        }
      },
      jumpBottom(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        if (useUIStore.getState().focusedPane === "DETAIL") {
          const el = detailScrollRef.current
          if (el) el.scrollTop = el.scrollHeight
        } else {
          useMailStore.getState().setCursor(threadCount - 1)
        }
      },
      openThread(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (useUIStore.getState().focusedPane !== "LIST") return
        const idx = useMailStore.getState().cursorIndex
        const id = getThreadId(idx)
        if (!id) return
        e.preventDefault()
        useMailStore.getState().setActiveThread(id)
        useUIStore.getState().setFocusedPane("DETAIL")
      },
      escape(e) {
        const { mode, focusedPane } = useUIStore.getState()
        e.preventDefault()
        if (mode === "VISUAL") {
          const anchor = useMailStore.getState().selectionAnchor
          const cursor = useMailStore.getState().cursorIndex
          if (anchor !== null) useMailStore.getState().setCursor(Math.min(anchor, cursor))
          useMailStore.getState().clearSelection()
          useUIStore.getState().setMode("NORMAL")
        } else if (mode === "INSERT") {
          useUIStore.getState().setMode("NORMAL")
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
        } else if (focusedPane === "DETAIL") {
          useUIStore.getState().setFocusedPane("LIST")
        }
      },
      prevThread(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (!useMailStore.getState().activeThreadId) return
        e.preventDefault()
        const cursor = useMailStore.getState().cursorIndex
        if (cursor <= 0) return
        const prevId = getThreadId(cursor - 1)
        if (!prevId) return
        useMailStore.getState().setCursor(cursor - 1)
        useMailStore.getState().setActiveThread(prevId)
      },
      nextThread(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (!useMailStore.getState().activeThreadId) return
        e.preventDefault()
        const cursor = useMailStore.getState().cursorIndex
        if (cursor >= threadCount - 1) return
        const nextId = getThreadId(cursor + 1)
        if (!nextId) return
        useMailStore.getState().setCursor(cursor + 1)
        useMailStore.getState().setActiveThread(nextId)
      },
      scrollLeft(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        if (useUIStore.getState().focusedPane !== "DETAIL") return
        e.preventDefault()
        scrollDetail(-SCROLL_STEP, 0)
      },

      // Visual mode
      visualDown(e) {
        if (useUIStore.getState().mode !== "VISUAL") return
        e.preventDefault()
        const next = clamp(useMailStore.getState().cursorIndex + 1)
        useMailStore.getState().extendSelection(computeSelectionRange(next), next)
      },
      visualUp(e) {
        if (useUIStore.getState().mode !== "VISUAL") return
        e.preventDefault()
        const next = clamp(useMailStore.getState().cursorIndex - 1)
        useMailStore.getState().extendSelection(computeSelectionRange(next), next)
      },
      visualToggle(e) {
        const { mode } = useUIStore.getState()
        if (mode === "INSERT") return
        e.preventDefault()
        if (mode === "VISUAL") {
          useMailStore.getState().clearSelection()
          useUIStore.getState().setMode("NORMAL")
        } else {
          useUIStore.getState().setFocusedPane("LIST")
          useMailStore.getState().enterVisualMode()
          const idx = useMailStore.getState().cursorIndex
          const id = getThreadId(idx)
          if (id) useMailStore.getState().extendSelection([id], idx)
          useUIStore.getState().setMode("VISUAL")
        }
      },

      // Actions
      archive(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.archive(ids)
      },
      trash(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.trash(ids)
      },
      spam(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        exitVisualAfterAction()
        actions.spam(ids)
      },
      toggleStar(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        actions.toggleStar(ids)
      },
      toggleUnread(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        actions.toggleUnread(ids)
      },
      undo(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        actions.undo()
      },
      mute(e) {
        const { mode } = useUIStore.getState()
        if (mode !== "NORMAL" && mode !== "VISUAL") return
        const ids = getActionIds()
        if (ids.length === 0) return
        e.preventDefault()
        if (mode === "VISUAL") exitVisualAfterAction()
        actions.archive(ids)
      },
      commandPalette(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        useUIStore.getState().setCommandPaletteOpen(true)
      },
      search(e) {
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
      labelPicker(e) {
        const { mode, focusedPane } = useUIStore.getState()
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
          e.preventDefault()
          scrollDetail(SCROLL_STEP, 0)
        } else {
          const id = getThreadId(useMailStore.getState().cursorIndex)
          if (!id) return
          e.preventDefault()
          useUIStore.getState().setLabelPickerTargetIds([id])
          useUIStore.getState().setLabelPickerOpen(true)
        }
      },

      // g-prefix navigation
      goInbox(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/INBOX")
      },
      goStarred(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/STARRED")
      },
      goSent(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/SENT")
      },
      goDrafts(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/DRAFT")
      },
      goAllMail(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/ALL")
      },
      goSpam(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/SPAM")
      },
      goTrash(e) {
        if (useUIStore.getState().mode !== "NORMAL") return
        e.preventDefault()
        goToLabel("/TRASH")
      },
    }

    // Build tinykeys handler map from effective bindings (defaults + overrides)
    const effective = getEffectiveBindings()
    const handlers: Record<string, (e: KeyboardEvent) => void> = {}
    for (const b of effective) {
      const handler = actionHandlers[b.action]
      if (!handler) continue
      if (handlers[b.key]) {
        // Multiple actions on the same key — chain them (mode checks prevent double-fire)
        const prev = handlers[b.key]
        handlers[b.key] = (e: KeyboardEvent) => {
          prev(e)
          handler(e)
        }
      } else {
        handlers[b.key] = handler
      }
    }

    const unsubscribe = tinykeys(window, handlers)
    return () => unsubscribe()
  }, [threadCount, getThreadId, router, params.label, detailScrollRef, actions, overridesKey])
}
