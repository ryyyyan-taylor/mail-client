"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import type { GmailMessage } from "./useMessages"
import { useSettingsStore } from "@/lib/store/settingsStore"
import { getDemoThread } from "@/lib/demo/data"

interface ThreadDetail {
  id: string
  historyId: string
  messages: GmailMessage[]
}

export function useThread(threadId: string | null) {
  const demoMode = useSettingsStore((s) => s.demoMode)

  return useQuery<ThreadDetail>({
    queryKey: [...queryKeys.thread(threadId ?? ""), { demoMode }],
    queryFn: async () => {
      if (useSettingsStore.getState().demoMode) {
        return getDemoThread(threadId!)
      }
      const res = await fetch(`/api/gmail/threads/${threadId}`)
      if (!res.ok) throw new Error("Failed to fetch thread")
      return res.json()
    },
    enabled: !!threadId,
  })
}
