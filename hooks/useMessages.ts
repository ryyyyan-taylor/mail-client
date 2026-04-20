"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import { useSettingsStore } from "@/lib/store/settingsStore"
import { getDemoThreads } from "@/lib/demo/data"

export interface GmailHeader {
  name: string
  value: string
}

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  internalDate: string
  payload: {
    headers: GmailHeader[]
    mimeType: string
    parts?: Array<{
      mimeType: string
      body: { data?: string; size: number }
    }>
    body: { data?: string; size: number }
  }
}

export interface ThreadListItem {
  id: string
  snippet: string
  historyId: string
  message: GmailMessage
}

interface ThreadsResponse {
  threads: ThreadListItem[]
  nextPageToken: string | null
  resultSizeEstimate: number
}

function getHeader(msg: GmailMessage, name: string): string {
  return (
    msg.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  )
}

export function extractSender(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>$/)
  if (match) return { name: match[1].replace(/"/g, ""), email: match[2] }
  return { name: from, email: from }
}

export function getMessageFields(msg: GmailMessage) {
  const from = getHeader(msg, "From")
  const subject = getHeader(msg, "Subject")
  const date = getHeader(msg, "Date")
  const sender = extractSender(from)
  const isUnread = msg.labelIds?.includes("UNREAD") ?? false
  const isStarred = msg.labelIds?.includes("STARRED") ?? false

  return { sender, subject, date, snippet: msg.snippet, isUnread, isStarred }
}

export function useMessages(label: string, q?: string) {
  const demoMode = useSettingsStore((s) => s.demoMode)

  return useInfiniteQuery<ThreadsResponse>({
    queryKey: [...queryKeys.messages(label, q), { demoMode }],
    queryFn: async ({ pageParam }) => {
      if (useSettingsStore.getState().demoMode) {
        return getDemoThreads(label, q)
      }
      const params = new URLSearchParams()
      params.set("labelIds", label)
      if (q) params.set("q", q)
      if (pageParam) params.set("pageToken", pageParam as string)

      const res = await fetch(`/api/gmail/threads?${params}`)
      if (!res.ok) throw new Error("Failed to fetch threads")
      return res.json()
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
  })
}
