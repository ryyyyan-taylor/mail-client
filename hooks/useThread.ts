"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import type { GmailMessage } from "./useMessages"

interface ThreadDetail {
  id: string
  historyId: string
  messages: GmailMessage[]
}

export function useThread(threadId: string | null) {
  return useQuery<ThreadDetail>({
    queryKey: queryKeys.thread(threadId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/gmail/threads/${threadId}`)
      if (!res.ok) throw new Error("Failed to fetch thread")
      return res.json()
    },
    enabled: !!threadId,
  })
}
