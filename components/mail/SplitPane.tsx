"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  leftFocused: boolean
  rightFocused: boolean
  defaultRatio?: number // 0-1, portion for left pane
}

export function SplitPane({
  left,
  right,
  leftFocused,
  rightFocused,
  defaultRatio = 0.5,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState(defaultRatio)
  const dragging = useRef(false)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragging.current = true
  }, [])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newRatio = (e.clientX - rect.left) / rect.width
      setRatio(Math.max(0.2, Math.min(0.8, newRatio)))
    }

    function onMouseUp() {
      dragging.current = false
    }

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  return (
    <div ref={containerRef} className="flex h-full">
      {/* Left pane */}
      <div
        className={`relative border-2 transition-colors ${
          leftFocused ? "border-blue-500" : "border-neutral-800"
        }`}
        style={{ width: `${ratio * 100}%` }}
      >
        <div className="absolute inset-0">{left}</div>
      </div>

      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="w-1.5 shrink-0 cursor-col-resize bg-neutral-800 hover:bg-blue-500 transition-colors"
      />

      {/* Right pane */}
      <div
        className={`relative border-2 transition-colors ${
          rightFocused ? "border-blue-500" : "border-neutral-800"
        }`}
        style={{ width: `${(1 - ratio) * 100}%` }}
      >
        <div className="absolute inset-0">{right}</div>
      </div>
    </div>
  )
}
