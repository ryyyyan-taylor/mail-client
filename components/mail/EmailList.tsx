"use client"

import { useRef, useEffect, useCallback, useMemo, type RefObject } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useMessages, type ThreadListItem } from "@/hooks/useMessages"
import { useMailStore } from "@/lib/store/mailStore"
import { useUIStore } from "@/lib/store/uiStore"
import { useKeybinds } from "@/lib/keybinds/useKeybinds"
import { useVirtualCursor } from "@/hooks/useVirtualCursor"
import { useBulkActions } from "@/hooks/useBulkActions"
import { EmailRow } from "./EmailRow"
import { SelectionBar } from "./SelectionBar"

interface EmailListProps {
  label: string
  q?: string
  detailScrollRef: RefObject<HTMLDivElement | null>
}

export function EmailList({ label, q, detailScrollRef }: EmailListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useMessages(label, q)

  const threads: ThreadListItem[] = useMemo(() => {
    const flat = data?.pages.flatMap((p) => p.threads) ?? []
    const starred = flat.filter((t) => t.message.labelIds?.includes("STARRED"))
    const rest = flat.filter((t) => !t.message.labelIds?.includes("STARRED"))
    return [...starred, ...rest]
  }, [data])

  const actions = useBulkActions()
  const cursorIndex = useMailStore((s) => s.cursorIndex)
  const selectedIds = useMailStore((s) => s.selectedIds)

  const scrollRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  // Keep cursor scrolled into view
  useVirtualCursor(rowVirtualizer)

  // Register keyboard shortcuts
  const getThreadId = useCallback(
    (index: number) => threads[index]?.id,
    [threads]
  )
  useKeybinds({ threadCount: threads.length, getThreadId, detailScrollRef, actions })

  // Reset cursor when switching labels
  useEffect(() => {
    useMailStore.getState().setCursor(0)
  }, [label])

  // Infinite scroll: fetch next page when scrolled near bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !hasNextPage || isFetchingNextPage) return

    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - scrollTop - clientHeight < 500) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [handleScroll])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
        <div className="spinner" />
        <span className="text-sm">Loading messages...</span>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400">
        <span className="text-sm font-medium">Failed to load messages</span>
        <span className="text-xs text-red-500">{(error as Error).message}</span>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-neutral-500">
        <span className="text-sm">No messages</span>
        {q && <span className="mt-1 text-xs text-neutral-600">Try a different search query</span>}
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="relative h-full overflow-auto">
      <SelectionBar />
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const thread = threads[virtualRow.index]
          return (
            <EmailRow
              key={thread.id}
              thread={thread}
              isCursor={virtualRow.index === cursorIndex}
              isSelected={selectedIds.has(thread.id)}
              onClick={() => {
                useMailStore.getState().setCursor(virtualRow.index)
                useMailStore.getState().setActiveThread(thread.id)
                useUIStore.getState().setFocusedPane("DETAIL")
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            />
          )
        })}
      </div>
      {isFetchingNextPage && (
        <div className="py-4 text-center text-sm text-neutral-500">
          Loading more...
        </div>
      )}
    </div>
  )
}
