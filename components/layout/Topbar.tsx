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
