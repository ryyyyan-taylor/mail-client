/**
 * Central keybind configuration — source of truth for all keyboard shortcuts.
 * Keys use tinykeys syntax (see https://github.com/jamiebuilds/tinykeys).
 */

export type KeyCategory = "navigation" | "go" | "actions" | "visual" | "general"

export interface KeyBinding {
  key: string
  description: string
  mode: "NORMAL" | "VISUAL" | "ALL"
  action: string
  category: KeyCategory
}

export const bindings: KeyBinding[] = [
  // Navigation
  { key: "j", description: "Cursor down", mode: "NORMAL", action: "cursorDown", category: "navigation" },
  { key: "k", description: "Cursor up", mode: "NORMAL", action: "cursorUp", category: "navigation" },
  { key: "g g", description: "Jump to top", mode: "NORMAL", action: "jumpTop", category: "navigation" },
  { key: "G", description: "Jump to bottom", mode: "NORMAL", action: "jumpBottom", category: "navigation" },
  { key: "Enter", description: "Open thread", mode: "NORMAL", action: "openThread", category: "navigation" },
  { key: "Escape", description: "Back / exit", mode: "ALL", action: "escape", category: "navigation" },
  { key: "[", description: "Previous thread", mode: "NORMAL", action: "prevThread", category: "navigation" },
  { key: "]", description: "Next thread", mode: "NORMAL", action: "nextThread", category: "navigation" },
  { key: "h", description: "Scroll left (detail)", mode: "NORMAL", action: "scrollLeft", category: "navigation" },

  // g-prefix label navigation
  { key: "g i", description: "Go to Inbox", mode: "NORMAL", action: "goInbox", category: "go" },
  { key: "g s", description: "Go to Starred", mode: "NORMAL", action: "goStarred", category: "go" },
  { key: "g t", description: "Go to Sent", mode: "NORMAL", action: "goSent", category: "go" },
  { key: "g d", description: "Go to Drafts", mode: "NORMAL", action: "goDrafts", category: "go" },
  { key: "g e", description: "Go to All Mail", mode: "NORMAL", action: "goAllMail", category: "go" },
  { key: "g x", description: "Go to Spam", mode: "NORMAL", action: "goSpam", category: "go" },
  { key: "g r", description: "Go to Trash", mode: "NORMAL", action: "goTrash", category: "go" },

  // Actions
  { key: "e", description: "Archive", mode: "NORMAL", action: "archive", category: "actions" },
  { key: "d", description: "Trash", mode: "NORMAL", action: "trash", category: "actions" },
  { key: "x", description: "Mark spam", mode: "NORMAL", action: "spam", category: "actions" },
  { key: "s", description: "Toggle star", mode: "NORMAL", action: "toggleStar", category: "actions" },
  { key: "y", description: "Toggle read/unread", mode: "NORMAL", action: "toggleUnread", category: "actions" },
  { key: "u", description: "Undo last action", mode: "NORMAL", action: "undo", category: "actions" },
  { key: "m", description: "Mute thread", mode: "NORMAL", action: "mute", category: "actions" },

  // Visual mode
  { key: "j", description: "Extend selection down", mode: "VISUAL", action: "visualDown", category: "visual" },
  { key: "k", description: "Extend selection up", mode: "VISUAL", action: "visualUp", category: "visual" },
  { key: "V", description: "Enter/exit VISUAL mode", mode: "NORMAL", action: "visualToggle", category: "visual" },

  // General
  { key: "/", description: "Focus search bar", mode: "NORMAL", action: "search", category: "general" },
  { key: "l", description: "Open label picker", mode: "NORMAL", action: "labelPicker", category: "general" },
  { key: "p", description: "Open command palette", mode: "NORMAL", action: "commandPalette", category: "general" },
]

/** Whether a binding's key can be remapped (single-character keys only) */
export function isEditable(binding: KeyBinding): boolean {
  return binding.key.length === 1
}
