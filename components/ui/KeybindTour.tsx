"use client"

import { useEffect, useState } from "react"

const TOUR_KEY = "vimmail-tour-seen"

interface TourStep {
  title: string
  description: string
  bindings: { key: string; label: string }[]
  tip?: string
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to VimMail",
    description:
      "VimMail is a keyboard-first Gmail client. You never need to touch your mouse. All navigation and actions use vim-style keys.",
    bindings: [],
    tip: "Already a vim user? You'll feel right at home.",
  },
  {
    title: "Navigate your inbox",
    description: "Move through your email list with the cursor keys:",
    bindings: [
      { key: "j", label: "Move cursor down" },
      { key: "k", label: "Move cursor up" },
      { key: "g g", label: "Jump to top" },
      { key: "G", label: "Jump to bottom" },
      { key: "Enter", label: "Open thread" },
      { key: "Escape", label: "Back to list" },
    ],
  },
  {
    title: "Jump between folders",
    description: "Press g followed by a letter to navigate instantly:",
    bindings: [
      { key: "g i", label: "Inbox" },
      { key: "g s", label: "Starred" },
      { key: "g t", label: "Sent" },
      { key: "g d", label: "Drafts" },
      { key: "g e", label: "All Mail" },
    ],
    tip: "In a thread? Use [ and ] to go to the previous or next thread.",
  },
  {
    title: "Act on emails",
    description: "With the cursor on any thread, one key does the action:",
    bindings: [
      { key: "e", label: "Archive" },
      { key: "d", label: "Trash" },
      { key: "s", label: "Star / unstar" },
      { key: "y", label: "Toggle read / unread" },
      { key: "l", label: "Apply a label" },
      { key: "m", label: "Mute thread" },
    ],
  },
  {
    title: "Select multiple threads",
    description:
      "Press V to enter Visual mode — then move with j / k to extend your selection. All actions work on the whole selection.",
    bindings: [
      { key: "V", label: "Enter Visual mode" },
      { key: "j / k", label: "Extend selection" },
      { key: "e", label: "Archive all selected" },
      { key: "d", label: "Trash all selected" },
      { key: "Escape", label: "Exit Visual mode" },
    ],
    tip: "A selection bar appears at the bottom with clickable actions too.",
  },
  {
    title: "Search & help",
    description: "A few more useful keys to know:",
    bindings: [
      { key: "/", label: "Focus search bar" },
      { key: "p", label: "Open command palette (all keybinds)" },
      { key: "u", label: "Undo last action" },
    ],
    tip: "You can remap any single-character keybind from the gear icon in the top bar.",
  },
]

export function KeybindTour() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(TOUR_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(TOUR_KEY, "1")
    setVisible(false)
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      dismiss()
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1))
  }

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss()
      if (e.key === "ArrowRight" || e.key === "l") next()
      if (e.key === "ArrowLeft" || e.key === "h") prev()
    }
    window.addEventListener("keydown", onKey, { capture: true })
    return () => window.removeEventListener("keydown", onKey, { capture: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step])

  if (!visible) return null

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[480px] rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-0.5 bg-neutral-800">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6">
          {/* Step counter */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs text-neutral-500 font-mono">
              {step + 1} / {STEPS.length}
            </span>
            <button
              onClick={dismiss}
              className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Skip tour
            </button>
          </div>

          {/* Title */}
          <h2 className="text-lg font-semibold text-neutral-100 mb-2">
            {current.title}
          </h2>

          {/* Description */}
          <p className="text-sm text-neutral-400 mb-4">{current.description}</p>

          {/* Keybinds */}
          {current.bindings.length > 0 && (
            <div className="rounded-lg bg-neutral-800/60 border border-neutral-700/50 divide-y divide-neutral-700/40 mb-4">
              {current.bindings.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-sm text-neutral-300">{b.label}</span>
                  <kbd className="rounded bg-neutral-700 px-2 py-0.5 text-xs font-mono text-neutral-200 whitespace-nowrap">
                    {b.key}
                  </kbd>
                </div>
              ))}
            </div>
          )}

          {/* Tip */}
          {current.tip && (
            <p className="text-xs text-blue-400/80 bg-blue-950/30 border border-blue-900/40 rounded-lg px-3 py-2 mb-4">
              {current.tip}
            </p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={prev}
              disabled={step === 0}
              className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 disabled:opacity-0 transition-colors"
            >
              ← Back
            </button>

            {/* Dot indicators */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    i === step ? "bg-blue-400" : "bg-neutral-600 hover:bg-neutral-500"
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              {isLast ? "Get started" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
