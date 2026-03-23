/**
 * Central keybind configuration — source of truth for all keyboard shortcuts.
 * Keys use tinykeys syntax (see https://github.com/jamiebuilds/tinykeys).
 */

export interface KeyBinding {
  key: string
  description: string
  mode: "NORMAL" | "VISUAL" | "ALL"
  action: string
}

export const bindings: KeyBinding[] = [
  // Navigation
  { key: "j", description: "Cursor down", mode: "NORMAL", action: "cursorDown" },
  { key: "k", description: "Cursor up", mode: "NORMAL", action: "cursorUp" },
  { key: "g g", description: "Jump to top", mode: "NORMAL", action: "jumpTop" },
  { key: "G", description: "Jump to bottom", mode: "NORMAL", action: "jumpBottom" },
  { key: "Enter", description: "Open thread", mode: "NORMAL", action: "openThread" },
  { key: "Escape", description: "Back / exit", mode: "ALL", action: "escape" },

  // g-prefix label navigation
  { key: "g i", description: "Go to Inbox", mode: "NORMAL", action: "goInbox" },
  { key: "g s", description: "Go to Starred", mode: "NORMAL", action: "goStarred" },
  { key: "g t", description: "Go to Sent", mode: "NORMAL", action: "goSent" },
  { key: "g d", description: "Go to Drafts", mode: "NORMAL", action: "goDrafts" },
  { key: "g e", description: "Go to All Mail", mode: "NORMAL", action: "goAllMail" },
  { key: "g x", description: "Go to Spam", mode: "NORMAL", action: "goSpam" },
  { key: "g r", description: "Go to Trash", mode: "NORMAL", action: "goTrash" },

  // Search + Labels
  { key: "/", description: "Focus search bar", mode: "NORMAL", action: "search" },
  { key: "l", description: "Open label picker", mode: "NORMAL", action: "labelPicker" },
  { key: "V", description: "Enter/exit VISUAL mode", mode: "NORMAL", action: "visualToggle" },

  // Actions
  { key: "e", description: "Archive", mode: "NORMAL", action: "archive" },
  { key: "d", description: "Trash", mode: "NORMAL", action: "trash" },
  { key: "x", description: "Mark spam", mode: "NORMAL", action: "spam" },
  { key: "s", description: "Toggle star", mode: "NORMAL", action: "toggleStar" },
  { key: "u", description: "Toggle read/unread", mode: "NORMAL", action: "toggleUnread" },
  { key: "m", description: "Mute thread", mode: "NORMAL", action: "mute" },
  { key: "p", description: "Open command palette", mode: "NORMAL", action: "commandPalette" },

  // Visual mode
  { key: "j", description: "Extend selection down", mode: "VISUAL", action: "visualDown" },
  { key: "k", description: "Extend selection up", mode: "VISUAL", action: "visualUp" },
]
