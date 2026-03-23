"use client"

import { useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useParams } from "next/navigation"
import { queryKeys } from "@/lib/queryKeys"
import { useMailStore } from "@/lib/store/mailStore"
import { useToastStore } from "@/lib/store/toastStore"
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

  function getQueryKey() {
    return queryKeys.messages(label)
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
   * Find the flat index of a thread ID in the pre-removal list.
   * Returns -1 if not found.
   */
  function findThreadIndex(data: InfiniteData, threadId: string): number {
    let idx = 0
    for (const page of data.pages) {
      for (const t of page.threads) {
        if (t.id === threadId) return idx
        idx++
      }
    }
    return -1
  }

  /**
   * After removing threads, place the cursor at the position where the
   * first removed item was — which is now the first message after the
   * deleted block. Clamps to list bounds.
   */
  function adjustCursorAfterRemoval(ids: string[], prevData: InfiniteData | undefined) {
    const { setCursor, setActiveThread } = useMailStore.getState()
    setActiveThread(null)

    // Find where the first removed thread was in the old list
    let targetIndex = 0
    if (prevData) {
      const firstRemovedIndex = ids.reduce((min, id) => {
        const idx = findThreadIndex(prevData, id)
        return idx >= 0 && idx < min ? idx : min
      }, Infinity)
      if (isFinite(firstRemovedIndex)) {
        targetIndex = firstRemovedIndex
      }
    }

    // Clamp to new list bounds
    const data = queryClient.getQueryData<InfiniteData>(getQueryKey())
    const totalThreads = data?.pages.reduce((sum, p) => sum + p.threads.length, 0) ?? 0
    if (totalThreads === 0) {
      setCursor(0)
    } else {
      setCursor(Math.min(targetIndex, totalThreads - 1))
    }
  }

  async function modifyThreads(
    ids: string[],
    body: { addLabelIds?: string[]; removeLabelIds?: string[] }
  ) {
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
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/gmail/threads/${id}`, { method: "DELETE" }).then((r) => {
          if (!r.ok) throw new Error(`Failed to trash thread ${id}`)
        })
      )
    )
  }

  /** Archive: remove INBOX label (removes from inbox, thread still exists) */
  async function archive(ids: string[]) {
    const threadIds = new Set(ids)
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await modifyThreads(ids, { removeLabelIds: ["INBOX"] })
      useToastStore.getState().addToast(`Archived ${ids.length} thread${ids.length > 1 ? "s" : ""}`)
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to archive", "error")
    }
    queryClient.invalidateQueries({ queryKey: getQueryKey() })
  }

  /** Trash: move to trash */
  async function trash(ids: string[]) {
    const threadIds = new Set(ids)
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await trashThreads(ids)
      useToastStore.getState().addToast(`Trashed ${ids.length} thread${ids.length > 1 ? "s" : ""}`)
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to trash", "error")
    }
    queryClient.invalidateQueries({ queryKey: getQueryKey() })
  }

  /** Spam: add SPAM label, remove INBOX */
  async function spam(ids: string[]) {
    const threadIds = new Set(ids)
    const prev = removeThreadsFromCache(threadIds)
    adjustCursorAfterRemoval(ids, prev)

    try {
      await modifyThreads(ids, { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX"] })
      useToastStore.getState().addToast(`Marked ${ids.length} thread${ids.length > 1 ? "s" : ""} as spam`)
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to mark as spam", "error")
    }
    queryClient.invalidateQueries({ queryKey: getQueryKey() })
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
    const prev = updateThreadLabelsInCache(threadIds, addLabelIds, removeLabelIds)

    try {
      await modifyThreads(ids, { addLabelIds, removeLabelIds })
      useToastStore.getState().addToast(isCurrentlyStarred ? "Unstarred" : "Starred")
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to update star", "error")
    }
    queryClient.invalidateQueries({ queryKey: getQueryKey() })
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
      useToastStore.getState().addToast(isCurrentlyUnread ? "Marked as read" : "Marked as unread")
    } catch {
      rollback(prev)
      useToastStore.getState().addToast("Failed to update read status", "error")
    }
    queryClient.invalidateQueries({ queryKey: getQueryKey() })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => ({ archive, trash, spam, toggleStar, toggleUnread }), [label])
}
