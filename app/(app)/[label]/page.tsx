"use client"

import { useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useMailStore } from "@/lib/store/mailStore"
import { useUIStore } from "@/lib/store/uiStore"
import { EmailList } from "@/components/mail/EmailList"
import { EmailDetail } from "@/components/mail/EmailDetail"
import { SplitPane } from "@/components/mail/SplitPane"
import { LabelPicker } from "@/components/mail/LabelPicker"
import { CommandPalette } from "@/components/ui/CommandPalette"
import { SettingsPanel } from "@/components/ui/SettingsPanel"
import { ToastContainer } from "@/components/ui/Toast"

export default function LabelPage() {
  const params = useParams<{ label: string }>()
  const searchParams = useSearchParams()
  const label = decodeURIComponent(params.label)
  const q = searchParams.get("q") || undefined
  const activeThreadId = useMailStore((s) => s.activeThreadId)
  const focusedPane = useUIStore((s) => s.focusedPane)
  const detailScrollRef = useRef<HTMLDivElement>(null)

  const listPane = <EmailList label={label} q={q} detailScrollRef={detailScrollRef} />

  const detailPane = activeThreadId ? (
    <EmailDetail ref={detailScrollRef} threadId={activeThreadId} />
  ) : (
    <div className="flex h-full items-center justify-center text-neutral-600 text-sm">
      Select a message to read
    </div>
  )

  return (
    <>
      <SplitPane
        left={listPane}
        right={detailPane}
        leftFocused={focusedPane === "LIST"}
        rightFocused={focusedPane === "DETAIL" && !!activeThreadId}
        onLeftClick={() => useUIStore.getState().setFocusedPane("LIST")}
        onRightClick={() => useUIStore.getState().setFocusedPane("DETAIL")}
      />
      <LabelPicker />
      <CommandPalette />
      <SettingsPanel />
      <ToastContainer />
    </>
  )
}
