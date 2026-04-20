"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"
import { useSettingsStore } from "@/lib/store/settingsStore"
import { DEMO_LABELS } from "@/lib/demo/data"

export interface GmailLabel {
  id: string
  name: string
  type: "system" | "user"
  messagesTotal?: number
  messagesUnread?: number
  threadsTotal?: number
  threadsUnread?: number
}

interface LabelsResponse {
  labels: GmailLabel[]
}

export function useLabels() {
  const demoMode = useSettingsStore((s) => s.demoMode)

  return useQuery<LabelsResponse>({
    queryKey: [...queryKeys.labels(), { demoMode }],
    queryFn: async () => {
      if (useSettingsStore.getState().demoMode) {
        return { labels: DEMO_LABELS }
      }
      const res = await fetch("/api/gmail/labels")
      if (!res.ok) throw new Error("Failed to fetch labels")
      return res.json()
    },
  })
}
