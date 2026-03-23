"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUIStore } from "@/lib/store/uiStore"
import { useLabels } from "@/hooks/useLabels"

const SYSTEM_LABELS = [
  { id: "INBOX", name: "Inbox", shortcut: "g i" },
  { id: "STARRED", name: "Starred", shortcut: "g s" },
  { id: "SENT", name: "Sent", shortcut: "g t" },
  { id: "DRAFT", name: "Drafts", shortcut: "g d" },
  { id: "SPAM", name: "Spam", shortcut: "g x" },
  { id: "TRASH", name: "Trash", shortcut: "g r" },
]

const HIDDEN_SYSTEM_IDS = new Set([
  "INBOX", "STARRED", "SENT", "DRAFT", "SPAM", "TRASH",
  "UNREAD", "IMPORTANT", "CHAT", "CATEGORY_PERSONAL",
  "CATEGORY_SOCIAL", "CATEGORY_PROMOTIONS", "CATEGORY_UPDATES",
  "CATEGORY_FORUMS",
])

const MODE_STYLES = {
  NORMAL: "bg-neutral-700 text-neutral-300",
  VISUAL: "bg-purple-900 text-purple-300",
  INSERT: "bg-green-900 text-green-300",
} as const

export function Sidebar() {
  const pathname = usePathname()
  const mode = useUIStore((s) => s.mode)
  const { data } = useLabels()

  // Build a map of label ID → unread count for badges
  const allLabels = data?.labels ?? []
  const unreadMap = new Map<string, number>()
  for (const l of allLabels) {
    if (l.threadsUnread && l.threadsUnread > 0) {
      unreadMap.set(l.id, l.threadsUnread)
    }
  }

  const userLabels = allLabels
    .filter((l) => !HIDDEN_SYSTEM_IDS.has(l.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <aside className="flex w-52 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="p-4">
        <h1 className="text-lg font-bold tracking-tight text-white">VimMail</h1>
      </div>
      <nav className="flex-1 overflow-y-auto px-2">
        {SYSTEM_LABELS.map((label) => {
          const href = `/${label.id}`
          const active = pathname === href
          const unread = unreadMap.get(label.id)
          return (
            <Link
              key={label.id}
              href={href}
              className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors ${
                active
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
              }`}
            >
              <span className="flex items-center gap-2">
                {label.name}
                {unread ? (
                  <span className="rounded-full bg-blue-600 px-1.5 text-[10px] font-medium text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </span>
              <kbd className="text-[10px] text-neutral-600">{label.shortcut}</kbd>
            </Link>
          )
        })}

        {userLabels.length > 0 && (
          <>
            <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
              Labels
            </div>
            {userLabels.map((label) => {
              const href = `/${encodeURIComponent(label.id)}`
              const active = pathname === href
              return (
                <Link
                  key={label.id}
                  href={href}
                  className={`flex items-center justify-between rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
                  }`}
                >
                  <span className="truncate">{label.name}</span>
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Mode indicator */}
      <div className="p-3">
        <div
          className={`rounded px-2.5 py-1 text-center text-xs font-bold tracking-widest ${MODE_STYLES[mode]}`}
        >
          -- {mode} --
        </div>
      </div>
    </aside>
  )
}
