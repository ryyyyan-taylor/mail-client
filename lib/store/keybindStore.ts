import { create } from "zustand"
import { persist } from "zustand/middleware"
import { bindings, type KeyBinding } from "@/lib/keybinds/bindings"

interface KeybindStore {
  overrides: Record<string, string>
  setOverride: (action: string, key: string) => void
  resetOverride: (action: string) => void
  resetAll: () => void
}

export const useKeybindStore = create<KeybindStore>()(
  persist(
    (set) => ({
      overrides: {},
      setOverride: (action, key) =>
        set((state) => ({ overrides: { ...state.overrides, [action]: key } })),
      resetOverride: (action) =>
        set((state) => {
          const { [action]: _, ...rest } = state.overrides
          return { overrides: rest }
        }),
      resetAll: () => set({ overrides: {} }),
    }),
    { name: "vimmail-keybinds" }
  )
)

/** Get all bindings with user overrides applied */
export function getEffectiveBindings(): KeyBinding[] {
  const overrides = useKeybindStore.getState().overrides
  return bindings.map((b) => ({
    ...b,
    key: overrides[b.action] ?? b.key,
  }))
}

function modesOverlap(a: string, b: string): boolean {
  if (a === "ALL" || b === "ALL") return true
  return a === b
}

/** Find bindings that would conflict if `action` were rebound to `newKey` */
export function findConflicts(action: string, newKey: string): KeyBinding[] {
  const binding = bindings.find((b) => b.action === action)
  if (!binding) return []
  const effective = getEffectiveBindings()
  return effective.filter(
    (b) => b.action !== action && b.key === newKey && modesOverlap(b.mode, binding.mode)
  )
}
