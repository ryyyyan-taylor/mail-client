"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useUIStore } from "@/lib/store/uiStore"
import { useKeybindStore, findConflicts } from "@/lib/store/keybindStore"
import { useSettingsStore } from "@/lib/store/settingsStore"
import { bindings, isEditable, type KeyCategory } from "@/lib/keybinds/bindings"

const CATEGORY_TITLES: Record<KeyCategory, string> = {
  navigation: "Navigation",
  go: "Go To",
  actions: "Actions",
  visual: "Visual Mode",
  general: "General",
}

const CATEGORY_ORDER: KeyCategory[] = ["navigation", "go", "actions", "visual", "general"]

export function SettingsPanel() {
  const open = useUIStore((s) => s.settingsOpen)
  const overrides = useKeybindStore((s) => s.overrides)
  const setOverride = useKeybindStore((s) => s.setOverride)
  const resetOverride = useKeybindStore((s) => s.resetOverride)
  const resetAll = useKeybindStore((s) => s.resetAll)
  const demoMode = useSettingsStore((s) => s.demoMode)
  const setDemoMode = useSettingsStore((s) => s.setDemoMode)

  const [editingAction, setEditingAction] = useState<string | null>(null)
  const [error, setError] = useState<{ action: string; message: string } | null>(null)
  const editingRef = useRef<string | null>(null)
  editingRef.current = editingAction

  const close = useCallback(() => {
    useUIStore.getState().setSettingsOpen(false)
    setEditingAction(null)
    setError(null)
  }, [])

  // Capture-phase listener blocks tinykeys and handles key capture for editing
  useEffect(() => {
    if (!open) return

    function handleKey(e: KeyboardEvent) {
      // Block everything from reaching tinykeys
      e.stopPropagation()

      if (editingRef.current) {
        // Currently editing a binding — capture the key
        if (e.key === "Escape") {
          e.preventDefault()
          setEditingAction(null)
          setError(null)
          return
        }

        // Only accept single printable characters
        if (e.key.length !== 1) return
        e.preventDefault()

        const newKey = e.key
        const action = editingRef.current

        // Check for conflicts
        const conflicts = findConflicts(action, newKey)
        if (conflicts.length > 0) {
          const conflictDesc = conflicts.map((c) => `"${c.description}"`).join(", ")
          setError({ action, message: `"${newKey}" conflicts with ${conflictDesc}` })
          return
        }

        // If setting back to default, remove the override
        const defaultBinding = bindings.find((b) => b.action === action)
        if (defaultBinding && newKey === defaultBinding.key) {
          resetOverride(action)
        } else {
          setOverride(action, newKey)
        }
        setEditingAction(null)
        setError(null)
      } else {
        // Not editing — Escape closes panel
        if (e.key === "Escape") {
          e.preventDefault()
          close()
        }
      }
    }

    window.addEventListener("keydown", handleKey, true)
    return () => window.removeEventListener("keydown", handleKey, true)
  }, [open, close, setOverride, resetOverride])

  // Reset state when panel closes
  useEffect(() => {
    if (!open) {
      setEditingAction(null)
      setError(null)
    }
  }, [open])

  if (!open) return null

  const hasAnyOverrides = Object.keys(overrides).length > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={close}>
      <div
        className="w-[420px] h-full bg-neutral-900 border-l border-neutral-700 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-200">Settings</h2>
          <button
            onClick={close}
            className="text-neutral-500 hover:text-neutral-300 transition-colors text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── App section ── */}
          <div className="p-4 border-b border-neutral-800">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
              App
            </h3>
            <div className="flex items-center justify-between rounded px-2 py-2">
              <div className="min-w-0">
                <div className="text-sm text-neutral-200">Demo mode</div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  Replace your emails with fake data for screenshots
                </div>
              </div>
              <button
                role="switch"
                aria-checked={demoMode}
                onClick={() => setDemoMode(!demoMode)}
                className={`relative ml-4 inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                  demoMode ? "bg-blue-600" : "bg-neutral-700"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    demoMode ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* ── Keyboard shortcuts section ── */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                Keyboard Shortcuts
              </h3>
              {hasAnyOverrides && (
                <button
                  onClick={() => {
                    resetAll()
                    setError(null)
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Reset all
                </button>
              )}
            </div>

            <div className="space-y-6">
              {CATEGORY_ORDER.map((cat) => {
                const items = bindings.filter((b) => b.category === cat)
                if (items.length === 0) return null
                return (
                  <div key={cat}>
                    <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                      {CATEGORY_TITLES[cat]}
                    </h4>
                    <div className="space-y-0.5">
                      {items.map((b) => {
                        const effectiveKey = overrides[b.action] ?? b.key
                        const hasOverride = b.action in overrides
                        const editable = isEditable(b)
                        const isEditingThis = editingAction === b.action
                        const errorForThis = error?.action === b.action ? error : null

                        return (
                          <div key={b.action}>
                            <div className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-neutral-800/50">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm text-neutral-300 truncate">
                                  {b.description}
                                </span>
                                {hasOverride && (
                                  <span className="text-[10px] text-neutral-600 shrink-0">
                                    was {b.key}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                {editable ? (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingAction(b.action)
                                        setError(null)
                                      }}
                                      className={`min-w-[28px] rounded px-2 py-0.5 text-xs font-mono text-center transition-colors ${
                                        isEditingThis
                                          ? "bg-blue-600 text-white animate-pulse"
                                          : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                      }`}
                                    >
                                      {isEditingThis ? "\u2026" : effectiveKey}
                                    </button>
                                    {hasOverride && !isEditingThis && (
                                      <button
                                        onClick={() => {
                                          resetOverride(b.action)
                                          setError(null)
                                        }}
                                        className="text-neutral-600 hover:text-neutral-400 text-xs"
                                        title={`Reset to default (${b.key})`}
                                      >
                                        &#8634;
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <kbd className="min-w-[28px] rounded bg-neutral-800 px-2 py-0.5 text-xs font-mono text-neutral-500 text-center">
                                    {b.key}
                                  </kbd>
                                )}
                              </div>
                            </div>
                            {errorForThis && (
                              <div className="px-2 pb-1 text-xs text-red-400">
                                {errorForThis.message}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-6 text-[10px] text-neutral-600 text-center pb-2">
              Click a key to rebind. Press Escape to cancel.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
