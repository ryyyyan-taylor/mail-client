"use client"

import { useEffect, useRef } from "react"
import type { Virtualizer } from "@tanstack/react-virtual"
import { useMailStore } from "@/lib/store/mailStore"

// Number of rows to keep visible beyond the cursor in the direction of travel,
// like vim's `scrolloff`. Clamped at the top/bottom of the list so the cursor
// can still reach the very first/last row.
const SCROLL_OFF = 3

export function useVirtualCursor(
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  count: number
) {
  const cursorIndex = useMailStore((s) => s.cursorIndex)
  const prevIndexRef = useRef(cursorIndex)

  useEffect(() => {
    const prevIndex = prevIndexRef.current
    prevIndexRef.current = cursorIndex
    const delta = cursorIndex - prevIndex

    // Only pad single-step moves (j/k). Clicks, gg/G, and other jumps land
    // exactly on the target instead of scrolling extra.
    let targetIndex = cursorIndex
    if (delta === 1) {
      targetIndex = Math.min(cursorIndex + SCROLL_OFF, count - 1)
    } else if (delta === -1) {
      targetIndex = Math.max(cursorIndex - SCROLL_OFF, 0)
    }

    virtualizer.scrollToIndex(targetIndex, { align: "auto" })
  }, [cursorIndex, virtualizer])
}
