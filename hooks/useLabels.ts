"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/queryKeys"

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
  return useQuery<LabelsResponse>({
    queryKey: queryKeys.labels(),
    queryFn: async () => {
      const res = await fetch("/api/gmail/labels")
      if (!res.ok) throw new Error("Failed to fetch labels")
      return res.json()
    },
  })
}
