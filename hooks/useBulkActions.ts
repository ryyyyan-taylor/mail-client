"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { queryKeys } from "@/lib/queryKeys"
import { useMailStore } from "@/lib/store/mailStore"
import { useToastStore } from "@/lib/store/toastStore"
import { useUndoStore } from "@/lib/store/undoStore"
import { useSettingsStore } from "@/lib/store/settingsStore"
import { sortThreadsForDisplay } from "@/lib/mail/sortThreads"
import type { ThreadListItem } from "@/hooks/useMessages"

interface ThreadsPage {
  threads: ThreadListItem[]
  nextPageToken: string | null
  resultSizeEstimate: number
}

type InfiniteData = { pages: ThreadsPage[]; pageParams: unknown[] }

export function useBulkActions() {
  const queryClient = useQueryClient()
  const params = useParams<{ label: string }>()
  const label = decodeURIComponent(params.label)
  const demoMode = useSettingsStore((s) => s.demoMode)

  function getQueryKey() {
    return [...queryKeys.messages(label), { demoMode }]
  }

  /** Remove threads from the current list cache optimistically */
  function removeThreadsFromCache(threadIds: Set<string>): InfiniteData | undefined {
    const key = getQueryKey()
    const prev = queryClient.getQueryData<InfiniteData>(key)
    if (!prev) return undefined

    queryClient.setQueryData<InfiniteData>(key, {
      ...prev,
      pages: prev.pages.map((page) => ({
        ...page,
        threads: page.threads.filter((t) => !threadIds.has(t.id)),
      })),
    })
    return prev
  }

  /** Update label arrays on threads in cache optimistically */
  function updateThreadLabelsInCache(
    threadIds: Set<string>,
    addLabelIds: string[],
    removeLabelIds: string[]
  ): InfiniteData | undefined {
    const key = getQueryKey()
    const prev = queryClient.getQueryData<InfiniteData>(key)
    if (!prev) return undefined

    queryClient.setQueryData<InfiniteData>(key, {
      ...prev,
      pages: prev.pages.map((page) => ({
        ...page,
        threads: page.threads.map((t) => {
          if (!threadIds.has(t.id)) return t
          let labels = t.message.labelIds ?? []
          labels = labels.filter((l) => !removeLabelIds.includes(l))
          for (const l of addLabelIds) {
            if (!labels.includes(l)) labels = [...labels, l]
          }
          return {
            ...t,
            message: { ...t.message, labelIds: labels },
          }
        }),
      })),
    })
    return prev
  }

  function rollback(prev: InfiniteData | undefined) {
    if (prev) {
      queryClient.setQueryData(getQueryKey(), prev)
    }
  }

  /**
   * Find the index of a thread ID in the pre-removal list, in the same
   * starred-pinned-to-top order the list actually renders in. Returns -1 if
   * not found.
   */
  function findThreadIndex(data: InfiniteData, threadId: string): number {
    const flat = data.pages.flatMap((page) => page.threads)
    const sorted = sortThreadsForDisplay(flat)
    return sorted.findIndex((t) => t.id === threadId)
  }

  /**
   * Index where the topmost of `ids` sat in the old (display-order) list,
   * clamped to the new list's bounds. Whether the block was removed or just
   * reordered elsewhere (e.g. starred to the top), everything that came
   * after it shifts up into this exact slot — so this is "the next mail in
   * the list sequentially" in both cases.
   */
  function computeCursorTargetIndex(ids: string[], prevData: InfiniteData | undefined): number {
    let targetIndex = 0
    if (prevData) {
      const firstIndex = ids.reduce((min, id) => {
        const idx = findThreadIndex(prevData, id)
        return idx >= 0 && idx < min ? idx : min
      }, Infinity)
      if (isFinite(firstIndex)) {
        targetIndex = firstIndex
      }
    }

    const data = queryClient.getQueryData<InfiniteData>(getQueryKey())
    const totalThreads = data?.pages.reduce((sum, p) => sum + p.threads.length, 0) ?? 0
    return totalThreads === 0 ? 0 : Math.min(targetIndex, totalThreads - 1)
  }

  /**
   * After removing threads, place the cursor at the position where the
   * first removed item was — which is now the first message after the
   * deleted block. Clamps to list bounds.
   */
  function adjustCursorAfterRemoval(ids: string[], prevData: InfiniteData | undefined) {
    useMailStore.getState().setActiveThread(null)
    useMailStore.getState().setCursor(computeCursorTargetIndex(ids, prevData))
  }

  /**
   * After a label change reorders the list without removing anything (e.g.
   * starring moves a thread to the top), keep the cursor visually in place
   * — pointing at whatever now occupies the slot the moved block vacated.
   * Unlike removal, the moved thread still exists, so the active thread (if
   * any) is left open rather than cleared.
   */
  function adjustCursorAfterMove(ids: string[], prevData: InfiniteData | undefined) {
    useMailStore.getState().setCursor(computeCursorTargetIndex(ids, prevData))
  }

  async function modifyThreads(
    ids: string[],
    body: { addLabelIds?: string[]; removeLabelIds?: string[] }
  ) {
    if (useSettingsStore.getState().demoMode) return
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/gmail/threads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed to modify thread ${id}`)
        })
      )
    )
  }

  async function trashThreads(ids: string[]) {
    if (useSettingsStore.getState().demoMode) return
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/gmail/threads/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error(`Failed to trash thread ${id}`)
        })
      )
    )
  }

  function pushUndo(entry: Omit<import("@/lib/store/undoStore").UndoEntry, "label">) {
    useUndoStore.getState().push({ ...entry, label })
  }

  /**
   * Snapshot cursor/active-thread before an optimistic update so a failed
   * request can put the user back exactly where they were, not just the
   * list contents.
   */
  function snapshotCursorState() {
    const { cursorIndex, activeThreadId } = useMailStore.getState()
    return { cursorIndex, activeThreadId }
  }

  function restoreCursorState(snapshot: { cursorIndex: number; activeThreadId: string | null }) {
    const { setCursor, setActiveThread } = useMailStore.getState()
    setCursor(snapshot.cursorIndex)
    setActiveThread(snapshot.activeThreadId)
  }

  /** Archive: remove INBOX label (removes from inbox, thread still exists) */
  async function archive(ids: string[]) {
    const threadIds = new Set(ids)
    const cursorSnapshot = snapshotCursorState()
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await modifyThreads(ids, { removeLabelIds: ["INBOX"] })
      const desc = `Archived ${ids.length} thread${ids.length > 1 ? "s" : ""}`
      pushUndo({ description: desc, threadIds: ids, addLabelIds: [], removeLabelIds: ["INBOX"], trashed: false })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      restoreCursorState(cursorSnapshot)
      useToastStore.getState().addToast("Failed to archive", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Trash: move to trash */
  async function trash(ids: string[]) {
    const threadIds = new Set(ids)
    const cursorSnapshot = snapshotCursorState()
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await trashThreads(ids)
      const desc = `Trashed ${ids.length} thread${ids.length > 1 ? "s" : ""}`
      pushUndo({ description: desc, threadIds: ids, addLabelIds: ["TRASH"], removeLabelIds: ["INBOX"], trashed: true })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      restoreCursorState(cursorSnapshot)
      useToastStore.getState().addToast("Failed to trash", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Spam: add SPAM label, remove INBOX */
  async function spam(ids: string[]) {
    const threadIds = new Set(ids)
    const cursorSnapshot = snapshotCursorState()
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await modifyThreads(ids, { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] })
      const desc = `Marked ${ids.length} thread${ids.length > 1 ? "s" : ""} as spam`
      pushUndo({ description: desc, threadIds: ids, addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"], trashed: false })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      restoreCursorState(cursorSnapshot)
      useToastStore.getState().addToast("Failed to mark as spam", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Move to label: add the label, remove from Inbox */
  async function applyLabel(ids: string[], labelId: string, labelName: string) {
    const threadIds = new Set(ids)
    const cursorSnapshot = snapshotCursorState()
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await modifyThreads(ids, { addLabelIds: [labelId], removeLabelIds: ["INBOX"] })
      const desc = `Labeled "${labelName}" — ${ids.length} thread${ids.length > 1 ? "s" : ""}`
      pushUndo({ description: desc, threadIds: ids, addLabelIds: [labelId], removeLabelIds: ["INBOX"], trashed: false })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      restoreCursorState(cursorSnapshot)
      useToastStore.getState().addToast("Failed to apply label", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Toggle star on threads */
  async function toggleStar(ids: string[]) {
    // Check if first thread is starred to decide toggle direction
    const data = queryClient.getQueryData<InfiniteData>(getQueryKey())
    const allThreads = data?.pages.flatMap((p) => p.threads) ?? []
    const firstThread = allThreads.find((t) => t.id === ids[0])
    const isCurrentlyStarred = firstThread?.message.labelIds?.includes("STARRED") ?? false

    const addLabelIds = isCurrentlyStarred ? [] : ["STARRED"]
    const removeLabelIds = isCurrentlyStarred ? ["STARRED"] : []

    const threadIds = new Set(ids)
    const cursorSnapshot = snapshotCursorState()
    const prev = updateThreadLabelsInCache(threadIds, addLabelIds, removeLabelIds)
    adjustCursorAfterMove(ids, prev)

    try {
      await modifyThreads(ids, { addLabelIds, removeLabelIds })
      const desc = isCurrentlyStarred ? "Unstarred" : "Starred"
      pushUndo({ description: desc, threadIds: ids, addLabelIds, removeLabelIds, trashed: false })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      restoreCursorState(cursorSnapshot)
      useToastStore.getState().addToast("Failed to update star", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Toggle read/unread on threads */
  async function toggleUnread(ids: string[]) {
    const data = queryClient.getQueryData<InfiniteData>(getQueryKey())
    const allThreads = data?.pages.flatMap((p) => p.threads) ?? []
    const firstThread = allThreads.find((t) => t.id === ids[0])
    const isCurrentlyUnread = firstThread?.message.labelIds?.includes("UNREAD") ?? false

    const addLabelIds = isCurrentlyUnread ? [] : ["UNREAD"]
    const removeLabelIds = isCurrentlyUnread ? ["UNREAD"] : []

    const threadIds = new Set(ids)
    const prev = updateThreadLabelsInCache(threadIds, addLabelIds, removeLabelIds)

    try {
      await modifyThreads(ids, { addLabelIds, removeLabelIds })
      const desc = isCurrentlyUnread ? "Marked as read" : "Marked as unread"
      pushUndo({ description: desc, threadIds: ids, addLabelIds, removeLabelIds, trashed: false })
      useToastStore.getState().addToast(desc)
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to update read status", "error")
    }
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    }
  }

  /** Undo the last action */
  async function undo() {
    const entry = useUndoStore.getState().pop()
    if (!entry) {
      useToastStore.getState().addToast("Nothing to undo")
      return
    }

    try {
      if (entry.trashed) {
        // Untrash via dedicated API
        await Promise.all(
          entry.threadIds.map((id) =>
            fetch(`/api/gmail/threads/${id}/untrash`, { method: "POST" }).then((r) => {
              if (!r.ok) throw new Error(`Failed to untrash thread ${id}`)
            })
          )
        )
        // Re-add the labels that were removed (e.g. INBOX)
        if (entry.removeLabelIds.length > 0) {
          await modifyThreads(entry.threadIds, { addLabelIds: entry.removeLabelIds })
        }
      } else {
        // Reverse: swap add/remove
        await modifyThreads(entry.threadIds, {
          addLabelIds: entry.removeLabelIds,
          removeLabelIds: entry.addLabelIds,
        })
      }
      useToastStore.getState().addToast(`Undid: ${entry.description}`)
    } catch {
      useToastStore.getState().addToast("Failed to undo", "error")
    }
    // Invalidate both the current view and the original action's view
    if (!useSettingsStore.getState().demoMode) {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      if (entry.label !== label) {
        queryClient.invalidateQueries({ queryKey: queryKeys.messages(entry.label) })
      }
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ archive, trash, spam, toggleStar, toggleUnread, applyLabel, undo }), [label])
}
