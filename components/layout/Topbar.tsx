"use client"

import { useRef } from "react"
import { signOut } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { useUIStore } from "@/lib/store/uiStore"
import type { User } from "next-auth"

export function Topbar({ user }: { user?: User }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const params = useParams<{ label: string }>()
  const searchQuery = useUIStore((s) => s.searchQuery)

  function handleFocus() {
    useUIStore.getState().setMode("INSERT")
  }

  function handleBlur() {
    // Mode change back to NORMAL is handled by Escape keybind
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      const q = (e.target as HTMLInputElement).value.trim()
      useUIStore.getState().setSearchQuery(q)
      useUIStore.getState().setMode("NORMAL")
      inputRef.current?.blur()
      // Navigate to current label with search query
      const label = params.label ? decodeURIComponent(params.label) : "INBOX"
      if (q) {
        router.push(`/${encodeURIComponent(label)}?q=${encodeURIComponent(q)}`)
      } else {
        router.push(`/${encodeURIComponent(label)}`)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      useUIStore.getState().setSearchQuery("")
      useUIStore.getState().setMode("NORMAL")
      inputRef.current!.value = ""
      inputRef.current?.blur()
    }
  }

  // Expose the ref so the `/` keybind can focus it
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__searchInputRef = inputRef
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-neutral-800 px-4">
      <div className="flex-1">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search mail (/)..."
          defaultValue={searchQuery}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full max-w-md rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none ring-neutral-700 focus:ring-1"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => useUIStore.getState().setSettingsOpen(true)}
          className="text-neutral-500 hover:text-neutral-300 transition-colors"
          title="Keyboard shortcuts settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
        {user?.image && (
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
