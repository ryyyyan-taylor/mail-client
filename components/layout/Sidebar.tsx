"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LABELS = [
  { id: "INBOX", name: "Inbox", shortcut: "g i" },
  { id: "STARRED", name: "Starred", shortcut: "g s" },
  { id: "SENT", name: "Sent", shortcut: "g t" },
  { id: "DRAFT", name: "Drafts", shortcut: "g d" },
  { id: "SPAM", name: "Spam", shortcut: "g !" },
  { id: "TRASH", name: "Trash", shortcut: "g #" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-52 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="p-4">
        <h1 className="text-lg font-bold tracking-tight text-white">VimMail</h1>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {LABELS.map((label) => {
          const href = `/${label.id}`
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
              <span>{label.name}</span>
              <kbd className="text-[10px] text-neutral-600">{label.shortcut}</kbd>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
