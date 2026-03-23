import { create } from "zustand"
import type { Mode } from "@/lib/keybinds/modes"

export type FocusedPane = "LIST" | "DETAIL"

interface UIStore {
  mode: Mode
  setMode: (mode: Mode) => void
  focusedPane: FocusedPane
  setFocusedPane: (pane: FocusedPane) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  labelPickerOpen: boolean
  setLabelPickerOpen: (open: boolean) => void
  labelPickerTargetIds: string[]
  setLabelPickerTargetIds: (ids: string[]) => void
  searchQuery: string
  setSearchQuery: (q: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  mode: "NORMAL",
  setMode: (mode) => set({ mode }),
  focusedPane: "LIST",
  setFocusedPane: (pane) => set({ focusedPane: pane }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  labelPickerOpen: false,
  setLabelPickerOpen: (open) => set({ labelPickerOpen: open }),
  labelPickerTargetIds: [],
  setLabelPickerTargetIds: (ids) => set({ labelPickerTargetIds: ids }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}))
