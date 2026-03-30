"use client"

import { getMessageFields, type ThreadListItem } from "@/hooks/useMessages"

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const isThisYear = date.getFullYear() === now.getFullYear()
  if (isThisYear) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
  })
}

interface EmailRowProps {
  thread: ThreadListItem
  isCursor: boolean
  isSelected: boolean
  style: React.CSSProperties
  onClick?: () => void
}

export function EmailRow({ thread, isCursor, isSelected, style, onClick }: EmailRowProps) {
  const { sender, subject, snippet, date, isUnread, isStarred } =
    getMessageFields(thread.message)

  return (
    <div
      style={style}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 border-b border-neutral-800/50 cursor-default select-none ${
        isCursor
          ? "bg-blue-950/60 border-l-2 border-l-blue-400"
          : isSelected
            ? "bg-blue-950/40"
            : isUnread
              ? "bg-neutral-950"
              : "bg-neutral-950/50"
      }`}
    >
      {/* Star */}
      <span className="w-4 shrink-0 text-center text-sm">
        {isStarred ? (
          <span className="text-yellow-400">&#9733;</span>
        ) : (
          <span className="text-neutral-700">&#9734;</span>
        )}
      </span>

      {/* Sender */}
      <span
        className={`w-48 shrink-0 truncate text-sm ${
          isUnread ? "font-semibold text-white" : "text-neutral-400"
        }`}
      >
        {sender.name}
      </span>

      {/* Subject + snippet */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <span
          className={`shrink-0 max-w-full truncate text-sm ${
            isUnread ? "font-semibold text-white" : "text-neutral-300"
          }`}
        >
          {subject || "(no subject)"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-neutral-600">
          {snippet}
        </span>
      </div>

      {/* Date */}
      <span
        className={`shrink-0 text-xs ${
          isUnread ? "font-semibold text-white" : "text-neutral-500"
        }`}
      >
        {formatDate(date)}
      </span>
    </div>
  )
}
