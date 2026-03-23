"use client"

import { signOut } from "next-auth/react"
import type { User } from "next-auth"

export function Topbar({ user }: { user?: User }) {
  return (
    <header className="flex h-12 items-center justify-between border-b border-neutral-800 px-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search mail (/)..."
          className="w-full max-w-md rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 placeholder-neutral-600 outline-none ring-neutral-700 focus:ring-1"
          readOnly
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
