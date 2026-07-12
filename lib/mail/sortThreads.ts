import type { ThreadListItem } from "@/hooks/useMessages"

/** Starred threads pinned to top, original order preserved within each group. */
export function sortThreadsForDisplay(threads: ThreadListItem[]): ThreadListItem[] {
  const starred = threads.filter((t) => t.message.labelIds?.includes("STARRED"))
  const rest = threads.filter((t) => !t.message.labelIds?.includes("STARRED"))
  return [...starred, ...rest]
}
