"use client"

import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import type { User } from "next-auth"

export function AppShell({
  user,
  children,
}: {
  user?: User
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
