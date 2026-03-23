"use client"

import { useEffect } from "react"
import type { Virtualizer } from "@tanstack/react-virtual"
import { useMailStore } from "@/lib/store/mailStore"

export function useVirtualCursor(
  virtualizer: Virtualizer<HTMLDivElement, Element>
) {
  const cursorIndex = useMailStore((s) => s.cursorIndex)

  useEffect(() => {
    virtualizer.scrollToIndex(cursorIndex, { align: "auto" })
  }, [cursorIndex, virtualizer])
}
