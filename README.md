<img src="app/icon.svg" width="48" height="48" align="left" style="margin-right: 16px; margin-top: 4px;" />

# VimMail

A keyboard-first Gmail client built for fast inbox culling and triage. Designed around Vim-style modal editing — move, select, and act on email at the speed of thought, without touching the mouse.

**Read and organize only.** No compose, no reply, no send (for now).

---

## Features

### Vim Modal Navigation

VimMail uses a three-mode state machine borrowed from Vim:

- **NORMAL** — the default mode. `j`/`k` move the cursor, `Enter` opens a thread, `Escape` returns to the list.
- **VISUAL** — entered with `V`. Extends a selection range as you move the cursor, enabling bulk actions across multiple threads.
- **INSERT** — entered when `/` focuses the search bar. All navigation shortcuts are suppressed while typing.

The current mode is always shown in the bottom-left corner of the sidebar.

### Split-Pane Reading View

The inbox and thread detail live side by side in a resizable split pane. Opening a thread never navigates away from the list — focus toggles between panes with `Enter` and `Escape`. The focused pane gets a blue border for clear visual indication.

### Keyboard Actions

In NORMAL mode, actions apply to the thread under the cursor. In VISUAL mode, they apply to the entire selection. Every action is optimistic — the UI updates instantly and rolls back gracefully on error.

| Key | Action |
|-----|--------|
| `e` | Archive |
| `d` | Trash |
| `x` | Mark as spam |
| `s` | Toggle star |
| `y` | Toggle read/unread |
| `u` | Undo last action |
| `m` | Mute thread |
| `l` | Open label picker |
| `p` | Open command palette |

### `g` Prefix Navigation

Quick-jump to any folder with a two-key sequence:

| Keys | Destination |
|------|-------------|
| `g i` | Inbox |
| `g s` | Starred |
| `g t` | Sent |
| `g d` | Drafts |
| `g e` | All Mail |
| `g x` | Spam |
| `g r` | Trash |

### Visual Mode Bulk Actions

Press `V` to enter visual selection mode. Use `j`/`k` to extend the selection in either direction, then hit any action key to apply it to all selected threads at once. A floating bar shows the count and action buttons. `Escape` exits and clears.

### Label Picker

`l` opens a modal label picker with a live-filter input and keyboard navigation. Works on a single thread or an entire visual selection.

### Search

`/` focuses the search bar. Queries are written to the URL so they're bookmarkable and survive refresh. `Escape` clears and returns to NORMAL.

### Customizable Keybindings

The gear icon opens a settings panel where any single-character keybind can be rebound. Click a key badge, press a new key — saved to `localStorage` immediately. Conflict detection prevents two actions in the same mode from sharing a key. The command palette always reflects the current bindings.

### Command Palette

`p` opens a searchable palette listing every keybind, grouped by category and filterable by key or description.

### First-time Tour

On first login, a 6-step interactive tour walks through the core keybinds — navigation, folder jumps, actions, visual mode, and search. Keyboard-navigable with arrow keys. Skippable at any time and never shown again once dismissed.

### Other Details

- Starred threads sorted to the top of every view
- Unread count badges on sidebar labels (live, capped at "99+")
- 5-action undo history
- Infinite scroll on all label views

---

## Built With

- **Next.js 14** — framework, routing, API proxy routes (Gmail API is never called from the browser)
- **NextAuth.js v5** — Google OAuth with automatic token refresh; tokens stay server-side
- **Zustand** — global state for cursor, selection, mode, and keybind overrides
- **TanStack Query v5** — data fetching, caching, and optimistic mutations with rollback
- **TanStack Virtual** — virtualized list rendering for large inboxes
- **tinykeys** — modal keybind registration with multi-key sequence support (`g i`, `g g`)
- **DOMPurify** — sanitizes HTML email bodies before rendering (strips scripts, styles, forms)
- **Tailwind CSS** — dark-theme UI throughout
