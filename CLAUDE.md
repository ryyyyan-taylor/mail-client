# VimMail — CLAUDE.md

Keyboard-first Gmail client for culling and sorting. No compose, no reply, no send. Read + organize only.

---

## Stack

- **Next.js 14 (App Router)** — framework + API routes (OAuth proxy, Gmail relay)
- **NextAuth.js v5 (Auth.js)** — Google OAuth, automatic token refresh via `jwt` callback
- **Zustand** — global state: cursor position, selection, mode, UI toggles
- **TanStack Query v5** — Gmail API data fetching, caching, optimistic mutations
- **TanStack Virtual** — virtualized email list (performance with large inboxes)
- **tinykeys** — keybind registration, supports multi-key sequences (`g i`, `g s`)
- **Tailwind CSS + shadcn/ui** — styling and accessible headless components
- **DOMPurify** — sanitize HTML email bodies before iframe rendering
- **`googleapis`** — official Google SDK, used server-side only in API routes

---

## Project Structure

```
vimmail/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                # App shell: sidebar + main area
│   │   ├── [label]/
│   │   │   └── page.tsx              # Email list view
│   │   └── [label]/[threadId]/
│   │       └── page.tsx              # Thread detail view (read only)
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts
│       └── gmail/
│           ├── messages/
│           │   ├── route.ts          # GET list
│           │   └── [id]/
│           │       └── route.ts      # GET single, PATCH labels, DELETE
│           ├── threads/
│           │   ├── route.ts          # GET thread list
│           │   └── [id]/
│           │       └── route.ts      # GET thread detail
│           └── labels/
│               └── route.ts         # GET all labels
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Label/folder nav (dynamic from Gmail)
│   │   ├── Topbar.tsx                # Search bar, settings gear, avatar
│   │   └── AppShell.tsx              # Sidebar + content layout wrapper
│   ├── mail/
│   │   ├── EmailList.tsx             # Virtualized list (TanStack Virtual)
│   │   ├── EmailRow.tsx              # Single row: sender, subject, snippet, date, star
│   │   ├── EmailDetail.tsx           # Read-only thread/message view
│   │   ├── SelectionBar.tsx          # Bulk action bar (visible when selection > 0)
│   │   └── LabelPicker.tsx           # Label assignment popover
│   └── ui/
│       ├── CommandPalette.tsx        # p key: shows all keybinds (uses effective keys)
│       ├── SettingsPanel.tsx         # Gear icon: editable keybind settings panel
│       └── Toast.tsx                 # Action feedback (e.g. "Archived 5 threads")
│
├── lib/
│   ├── gmail/
│   │   ├── client.ts                 # Authenticated googleapis client factory
│   │   ├── messages.ts               # listMessages, getMessage, modifyMessage, trashMessage, deleteMessage
│   │   ├── threads.ts                # listThreads, getThread
│   │   ├── labels.ts                 # listLabels
│   │   └── codec.ts                  # base64url decode for email bodies
│   ├── keybinds/
│   │   ├── bindings.ts               # Central keybind config (action, key, mode, category)
│   │   ├── useKeybinds.ts            # Hook: builds tinykeys map dynamically from effective bindings
│   │   └── modes.ts                  # Mode enum + transition logic
│   └── store/
│       ├── mailStore.ts              # cursorIndex, selectionAnchor, selectedIds, activeThreadId
│       ├── uiStore.ts                # commandPaletteOpen, labelPickerOpen, settingsOpen, mode
│       └── keybindStore.ts           # User keybind overrides, persisted to localStorage
│
├── hooks/
│   ├── useMessages.ts                # TanStack Query: list + infinite scroll
│   ├── useThread.ts                  # TanStack Query: thread detail
│   ├── useBulkActions.ts             # Optimistic mutations for all modify operations
│   └── useVirtualCursor.ts           # Cursor index → scroll-into-view
│
├── auth.ts                           # NextAuth config
├── middleware.ts                     # Redirect unauthenticated users to /login
├── tailwind.config.ts
├── next.config.ts
└── .env.local                        # See Environment Variables section
```

---

## Environment Variables

```bash
# .env.local
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_SECRET=         # generate with: openssl rand -base64 32
NEXTAUTH_URL=            # http://localhost:3000 in dev, your Vercel URL in prod
```

Google Cloud setup:
- Enable **Gmail API** in Google Cloud Console
- OAuth consent screen: add scopes `gmail.readonly` and `gmail.modify`
- Add `http://localhost:3000/api/auth/callback/google` as authorized redirect URI
- Consent screen can stay in **Testing** mode for personal use (no verification needed)

---

## Auth Architecture

NextAuth is configured with the Google provider. The `jwt` callback must handle token refresh:

```ts
// auth.ts — critical: token refresh logic
callbacks: {
  async jwt({ token, account }) {
    if (account) {
      // Initial sign in — store tokens
      return {
        ...token,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at,
      }
    }
    // Token still valid
    if (Date.now() < (token.expiresAt as number) * 1000) return token

    // Token expired — refresh it
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken as string,
      }),
    })
    const tokens = await response.json()
    return { ...token, accessToken: tokens.access_token, expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in) }
  },
  async session({ session, token }) {
    session.accessToken = token.accessToken as string
    return session
  },
}
```

All Gmail API routes call `auth()` to get the session, then pass `session.accessToken` to the googleapis client. Tokens never touch the browser.

---

## Gmail API Proxy Pattern

Every `/app/api/gmail/*` route follows this pattern:

```ts
import { auth } from "@/auth"
import { google } from "googleapis"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const gmail = google.gmail({
    version: "v1",
    auth: new google.auth.OAuth2(),
  })
  gmail.context._options.auth.setCredentials({ access_token: session.accessToken })

  // ... call gmail API, return normalized JSON
}
```

### Routes to implement

| Route | Method | Gmail API call | Notes |
|---|---|---|---|
| `/api/gmail/messages` | GET | `messages.list` | Accept `labelIds`, `q`, `pageToken` query params |
| `/api/gmail/messages/[id]` | GET | `messages.get` | `format=full` for detail view |
| `/api/gmail/messages/[id]` | PATCH | `messages.modify` | Body: `{ addLabelIds, removeLabelIds }` |
| `/api/gmail/messages/[id]` | DELETE | `messages.trash` | Moves to trash (use `delete` only for permanent) |
| `/api/gmail/threads` | GET | `threads.list` | Same params as messages |
| `/api/gmail/threads/[id]` | GET | `threads.get` | Returns all messages in thread |
| `/api/gmail/labels` | GET | `labels.list` | Returns all user labels |

---

## Keyboard Mode State Machine

Three modes stored in `uiStore`:

```
NORMAL ──── V ────► VISUAL ──── Escape ────► NORMAL
NORMAL ──── / ────► INSERT (search focused)
INSERT ─── Escape ──► NORMAL
```

All keybind handlers in `useKeybinds.ts` check `currentMode` before executing. `tinykeys` is registered at the document level but gated by mode.

### NORMAL Mode Keybinds

**Navigation**
| Key | Action |
|---|---|
| `j` | Cursor down |
| `k` | Cursor up |
| `gg` | Jump to top |
| `G` | Jump to bottom |
| `Enter` | Open thread at cursor |
| `Escape` | Back to list from thread |
| `[` | Previous thread (in detail view) |
| `]` | Next thread (in detail view) |

**`g` prefix — go to label**
| Key | Destination |
|---|---|
| `g i` | Inbox |
| `g s` | Starred |
| `g t` | Sent |
| `g d` | Drafts |
| `g e` | All Mail |
| `g !` | Spam |
| `g #` | Trash |

**Actions (on cursor row)**
| Key | Action |
|---|---|
| `e` | Archive (remove INBOX label) |
| `#` | Trash |
| `!` | Mark spam |
| `l` | Open label picker |
| `u` | Toggle read/unread |
| `s` | Toggle star |
| `m` | Mute thread |
| `/` | Focus search bar (enter INSERT) |
| `?` | Open command palette |
| `V` | Enter VISUAL mode |

### VISUAL Mode Keybinds

| Key | Action |
|---|---|
| `j` | Extend selection down |
| `k` | Extend selection up |
| `e` | Archive all selected |
| `#` | Trash all selected |
| `!` | Spam all selected |
| `l` | Label all selected |
| `u` | Mark all selected read/unread |
| `s` | Star all selected |
| `Escape` | Exit VISUAL, clear selection |

---

## Zustand Store Shapes

```ts
// lib/store/mailStore.ts
interface MailStore {
  cursorIndex: number
  selectionAnchor: number | null
  selectedIds: Set<string>       // thread/message IDs
  activeThreadId: string | null
  setCursor: (index: number) => void
  enterVisualMode: () => void
  extendSelection: (index: number) => void
  clearSelection: () => void
  toggleStar: (id: string) => void  // optimistic, local only
}

// lib/store/uiStore.ts
type Mode = "NORMAL" | "VISUAL" | "INSERT"
interface UIStore {
  mode: Mode
  setMode: (mode: Mode) => void
  commandPaletteOpen: boolean
  labelPickerOpen: boolean
  labelPickerTargetIds: string[]
  searchQuery: string
}
```

---

## Multi-select / Visual Mode Logic

- `selectionAnchor` is set to `cursorIndex` when `V` is pressed
- On `j`/`k` in VISUAL mode: `selectedIds` = all IDs between `selectionAnchor` and new `cursorIndex` (inclusive, supports both directions)
- `SelectionBar` renders when `selectedIds.size > 0`, floats above the email list
- Bulk actions call `useBulkActions` which:
  1. Immediately removes/modifies items in TanStack Query cache (optimistic)
  2. Fires PATCH/DELETE requests for each selected ID (can batch with `Promise.all`)
  3. On error: rolls back cache, shows error toast
  4. On success: shows success toast ("Archived 7 threads")

---

## Email List Virtualization

Use `@tanstack/react-virtual` for `EmailList`. Key config:

```ts
const rowVirtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 56,       // px — standard Gmail row height
  overscan: 10,
})
```

`useVirtualCursor` hook watches `cursorIndex` changes and calls `rowVirtualizer.scrollToIndex(cursorIndex, { align: "auto" })` to keep cursor in view during keyboard nav.

---

## Email Body Rendering

HTML emails render inline via `dangerouslySetInnerHTML` after DOMPurify sanitization:

```tsx
<div
  className="email-body overflow-x-auto rounded bg-white p-4 text-black"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["style", "script", "form", "input", "textarea", "select"],
  }) }}
/>
```

- DOMPurify strips scripts, styles, forms — safe for inline rendering
- Scoped `.email-body` CSS rules in `globals.css` constrain images, tables, links
- No iframe — avoids focus trap, scroll issues, and height sizing problems
- Plain text emails: render in `<pre className="font-mono text-sm whitespace-pre-wrap">`
- Email bodies are base64url encoded in Gmail API — decode with `lib/gmail/codec.ts`

---

## TanStack Query Keys

Establish consistent query key conventions:

```ts
export const queryKeys = {
  messages: (labelId: string, q?: string) => ["messages", labelId, q],
  thread: (id: string) => ["thread", id],
  labels: () => ["labels"],
}
```

Mutations should `invalidateQueries` on the relevant message/thread list after success.

---

## Phased Build Order

### Phase 1 — Auth + Shell
- [x] Init Next.js 14 project with Tailwind (shadcn/ui deferred to Phase 8)
- [x] Configure NextAuth with Google provider + token refresh callback
- [x] `middleware.ts` — protect `/(app)` routes
- [x] `AppShell`, `Sidebar` (static labels for now), `Topbar` layout
- [x] Login page at `/login`

### Phase 2 — Gmail API Routes + Email List
- [x] All API routes in `/app/api/gmail/`
- [x] `useMessages` hook with TanStack Query
- [x] `EmailList` with TanStack Virtual
- [x] `EmailRow` component (sender, subject, snippet, date, labels, star indicator)
- [x] Infinite scroll via `pageToken`

### Phase 3 — Keyboard Navigation (NORMAL)
- [x] Zustand stores (`mailStore`, `uiStore`)
- [x] `useKeybinds` hook with `tinykeys`
- [x] `j`/`k` cursor movement + visual highlight on rows
- [x] `Enter` to open thread, `Escape` back to list
- [x] `g *` prefix navigation between labels

### Phase 4 — Thread Detail View
- [x] `useThread` hook
- [x] `EmailDetail` component — thread message list, expandable messages
- [x] HTML body rendering (iframe + DOMPurify)
- [x] Plain text fallback
- [x] `[` / `]` to navigate prev/next thread from detail view

### Phase 5 — Single-email Actions
- [x] `useBulkActions` hook (works for single too — pass `[id]`)
- [x] Archive (`e`), Trash (`#`), Spam (`!`), Star (`s`), Unread (`u`)
- [x] Optimistic updates + rollback
- [x] `Toast` component for feedback

### Phase 6 — Visual Mode + Bulk Actions
- [x] Mode state machine in `uiStore`
- [x] Visual mode keybinds + range selection logic
- [x] `SelectionBar` with bulk action buttons
- [x] Bulk archive/trash/spam/star/unread via `Promise.all`

### Phase 7 — Labels + Search
- [x] Dynamic label list in `Sidebar` (from `/api/gmail/labels`)
- [x] `LabelPicker` popover for `l` keybind
- [x] Search bar in `Topbar` wired to `q=` Gmail param
- [x] Update `useMessages` to accept search query

### Phase 8 — Polish
- [x] `CommandPalette` component (triggered by `?`)
- [x] ~~`KeybindHint` overlays visible on hover~~ (deferred — keybind hints already shown in sidebar shortcuts + command palette)
- [x] Mute thread (`m`)
- [x] Unread count badges on sidebar labels
- [x] Loading/error states throughout

---

## Out of Scope (v1)

- No compose, reply, reply-all, or forward
- No send functionality whatsoever — `gmail.send` scope is not requested
- No offline mode or local email cache
- No push notifications (polling on window focus is acceptable)
- No calendar, Meet, or Chat integration
- No multi-account support
- No Shift+ modifier support in keybind settings (single-character keys only)

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Set environment variables in Vercel dashboard (same four as `.env.local`)
4. Update `NEXTAUTH_URL` to your Vercel deployment URL
5. Add Vercel URL to Google Cloud OAuth authorized redirect URIs: `https://your-app.vercel.app/api/auth/callback/google`

Free tier is sufficient for personal use. Gmail API quotas (1B units/day) will never be reached.

---

## Session Notes

### 2026-03-22 — Phase 1 Complete

**What was done:**
- Initialized Next.js 14 project with TypeScript + Tailwind (yarn, not npm)
- Configured NextAuth v5 (beta.30) with Google OAuth provider + automatic token refresh
- Auth middleware protecting all `/(app)` routes
- App shell: `AppShell`, `Sidebar` (static labels with vim shortcut hints), `Topbar` (search placeholder + avatar + sign out)
- Login page with Google sign-in button
- Placeholder pages for `[label]` and `[label]/[threadId]` routes
- Root `/` redirects to `/INBOX`
- Clean production build verified

**Pending (user action required):**
- Google Cloud Console: create OAuth credentials, enable Gmail API, add `http://localhost:3000/api/auth/callback/google` as redirect URI
- Create `.env.local` with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `AUTH_TRUST_HOST`
- Test OAuth login flow with `yarn dev`

**Notes:**
- npm/npx broken on Node v25.7.0 — using yarn throughout
- Next.js 14 uses `--turbo` flag (not `--turbopack`)
- shadcn/ui deferred to Phase 8 — plain Tailwind sufficient for now
- NextAuth v5 beta doesn't support `declare module "next-auth/jwt"` augmentation — using `as` casts for JWT token fields instead

**Next up:** Phase 2 — Gmail API routes + email list

### 2026-03-23 — Phase 2 Complete

**What was done:**
- Gmail API lib layer: `lib/gmail/client.ts` (authenticated client factory), `messages.ts`, `threads.ts`, `labels.ts`, `codec.ts`
- All 6 API routes: `messages` (GET list), `messages/[id]` (GET/PATCH/DELETE), `threads` (GET list), `threads/[id]` (GET), `labels` (GET)
- TanStack Query provider (`lib/providers.tsx`) wired into root layout
- Query key conventions in `lib/queryKeys.ts`
- `useMessages` hook with infinite query (thread-based, fetches preview message per thread)
- `EmailList` component with TanStack Virtual (virtualized rows, scroll-based infinite loading)
- `EmailRow` component (star, sender, subject, snippet, relative date, unread bold styling)
- `[label]/page.tsx` converted from placeholder to live EmailList
- Clean production build verified

**Notes:**
- Thread list endpoint fetches first message per thread for preview data (subject, sender, date) — trades N+1 API calls for richer list display
- Installed `@tanstack/react-query` and `@tanstack/react-virtual`
- `[label]/page.tsx` is now a client component (needs `useParams` for reactive label switching)

**Next up:** Phase 3 — Keyboard navigation (NORMAL mode)

### 2026-03-23 — Phase 3 Complete

**What was done:**
- Zustand stores: `mailStore` (cursor, selection, activeThread), `uiStore` (mode, command palette, label picker, search)
- Mode type in `lib/keybinds/modes.ts`
- Central keybind config in `lib/keybinds/bindings.ts`
- `useKeybinds` hook: registers tinykeys listeners gated by mode, handles j/k/gg/G navigation, Enter to open thread, Escape to go back/exit modes, all g-prefix label navigation (g i, g s, g t, g d, g e, g !, g #)
- `useVirtualCursor` hook: auto-scrolls virtualizer to keep cursor in view
- `EmailRow` updated: cursor highlight with blue left border + bg tint (`isCursor` prop)
- `EmailList` wired up: cursor state, keybinds, virtual cursor, cursor reset on label change
- Installed `zustand` and `tinykeys`

**Notes:**
- tinykeys package.json exports don't resolve types properly — using `@ts-expect-error` on import
- Cursor row styled with `bg-blue-950/60 border-l-2 border-l-blue-400` for clear visual distinction

**Next up:** Phase 4 — Thread detail view

### 2026-03-23 — Phase 4 Complete

**What was done:**
- `useThread` hook: TanStack Query fetch for single thread (full format, all messages)
- `EmailDetail` component (forwardRef): sticky subject header, message count, expandable message cards (last message expanded by default), avatar initial, sender/date/to header, snippet preview when collapsed
- Recursive MIME part walker in `getBody()` handles multipart messages
- Plain text fallback: `<pre>` with `whitespace-pre-wrap`
- Installed `dompurify`

**UI pivot — split-pane reading view (replaces full-page thread route):**
- `SplitPane` component: resizable drag handle (absolute-positioned pane content), 50% default split (20%-80% range), thick blue border on focused pane
- `[label]/page.tsx` renders EmailList + EmailDetail side by side in SplitPane
- `Enter` opens thread in right pane and focuses it (no route navigation)
- `Escape` returns focus to list pane (keeps message open)
- `j`/`k`/`gg`/`G` scroll the detail pane when it's focused, navigate the list when list is focused
- `h`/`l` scroll detail pane horizontally when focused
- `[`/`]` navigate prev/next thread (moved from useThreadNav into useKeybinds)
- `focusedPane` state added to uiStore (`LIST` | `DETAIL`)
- Focus border: `border-2 border-blue-500` on focused pane, `border-neutral-800` on unfocused
- Mode indicator in sidebar bottom-left: `-- NORMAL --` / `-- VISUAL --` / `-- INSERT --` with color coding
- Removed `useThreadNav` hook (merged into useKeybinds)
- `[label]/[threadId]/page.tsx` now redirects to `[label]` (no longer used for viewing)

**HTML rendering pivot — iframe → inline `dangerouslySetInnerHTML`:**
- Iframe caused: focus trap (captured all keystrokes on click), scroll-wheel blocked, height wouldn't fill pane
- Replaced with DOMPurify-sanitized inline HTML in a `<div>` with `.email-body` scoped CSS
- FORBID_TAGS: style, script, form, input, textarea, select
- Scoped CSS in `globals.css`: constrains images, tables, links within `.email-body`

**Notes:**
- `AppShell` main changed from `overflow-auto` to `overflow-hidden` — each pane manages its own scrolling
- SplitPane pane content uses `absolute inset-0` (no `overflow-hidden` wrapper) so children can scroll freely

**Next up:** Phase 5 — Single-email actions

### 2026-03-23 — Phase 5 Complete

**What was done:**
- `useBulkActions` hook: archive, trash, spam, toggleStar, toggleUnread — all with optimistic cache updates + rollback on error
- Thread-level Gmail API: `modifyThread`, `trashThread` in `lib/gmail/threads.ts`
- API routes: PATCH and DELETE on `/api/gmail/threads/[id]` for thread-level modify/trash
- Keybinds wired: `e` (archive), `#`/`Shift+3` (trash), `!`/`Shift+1` (spam), `s` (star), `u` (unread)
- Toast system: `toastStore` (zustand) with auto-dismiss (3s), `ToastContainer` component
- `bindings.ts` updated with all action keybinds
- Cursor auto-adjusts after thread removal (clamps to new list bounds, clears active thread)
- `useBulkActions` return value memoized by label to avoid re-registering tinykeys every render
- Clean production build verified

**Notes:**
- Actions operate on threads (not individual messages) via Gmail `threads.modify`/`threads.trash` API
- Archive = remove INBOX label; Spam = add SPAM + remove INBOX; Star/Unread = toggle based on current state
- `removeThreadsFromCache` optimistically strips threads from the infinite query pages for archive/trash/spam
- `updateThreadLabelsInCache` optimistically flips label arrays for star/unread (thread stays in list)
- After mutation (success or error), `invalidateQueries` re-fetches to ensure cache consistency

**Next up:** Phase 6 — Visual mode + bulk actions

### 2026-03-23 — Phase 6 Complete

**What was done:**
- `V` (`Shift+v`) enters VISUAL mode, sets selection anchor at cursor, highlights cursor row
- `j`/`k` in VISUAL mode extends selection range (all IDs between anchor and cursor, inclusive)
- `Escape` or `V` again exits VISUAL mode, clears selection
- All action keybinds (`e`, `d`, `!`, `s`, `u`) work in both NORMAL (cursor) and VISUAL (selection) modes
- Actions in VISUAL mode auto-exit to NORMAL and clear selection after firing
- `SelectionBar` component: floats at bottom of list, shows count + clickable action buttons with keybind hints
- `EmailRow` gains `isSelected` prop: selected rows get `bg-blue-950/40` highlight
- Trash keybind changed from `#`/`Shift+3` to `d` (per user edit to bindings.ts)
- `useBulkActions` already handles multi-ID operations via `Promise.all` (from Phase 5)
- Clean production build verified

**Notes:**
- Visual selection uses `selectionAnchor` (set on V press) + `cursorIndex` to compute range — supports both downward and upward selection
- `getActionIds()` helper in useKeybinds returns selected IDs in VISUAL mode or `[cursorId]` in NORMAL — unifies action handlers for both modes
- `SelectionBar` renders inside `EmailList` with `absolute` positioning + z-index, only visible when VISUAL mode + selectedIds > 0

**Next up:** Phase 7 — Labels + search

### 2026-03-23 — Phase 7 Complete

**What was done:**
- `useLabels` hook: TanStack Query fetch for all Gmail labels
- Sidebar: dynamic user labels section below system labels, sorted alphabetically, hidden system/category labels filtered out
- `LabelPicker` component: modal overlay with filter input, arrow key / j/k navigation, Enter to apply, Escape to close
- `l` keybind: opens label picker for cursor thread (NORMAL) or selected threads (VISUAL), doesn't conflict with detail pane horizontal scroll
- Search bar in Topbar: `/` focuses input (enters INSERT mode), Enter submits query via `?q=` URL param, Escape clears and exits
- `[label]/page.tsx` reads `q` search param via `useSearchParams()` and passes to `EmailList`
- `useMessages` already accepted `q` param (from Phase 2) — now wired end-to-end
- `bindings.ts` updated with `/`, `l`, `V` keybind entries
- Clean production build verified

**Notes:**
- Search uses URL query params (`?q=...`) so it's bookmarkable and survives page refresh
- Search input ref exposed via `window.__searchInputRef` for the `/` keybind to focus it from tinykeys
- `l` handler merged into existing `l` keybind (was detail pane scroll) — checks focusedPane to decide behavior
- LabelPicker applies labels via PATCH `/api/gmail/threads/[id]` with `addLabelIds`
- Sidebar filters out system labels (INBOX, STARRED, etc.) and category labels to avoid duplicates

**Next up:** Phase 8 — Polish

### 2026-03-23 — Phase 8 Complete

**What was done:**
- `CommandPalette` component: `?` (`Shift+/`) opens modal showing all keybinds, grouped by category (Navigation, Actions, Visual, General), filterable by description or key
- Mute thread: `m` keybind archives the thread (removes INBOX label) — same behavior as `e` per Gmail semantics
- Unread count badges: sidebar system labels show blue pill badge with `threadsUnread` count from labels API (caps at "99+")
- Loading states: spinner animation (CSS `@keyframes spin`) + descriptive text for both EmailList and EmailDetail loading
- Error states: two-line error display (title + detail message) for both EmailList and EmailDetail
- Empty state: "No messages" with search hint when `q` param is active
- `bindings.ts` updated with `m` (mute) and `Shift+/` (command palette) entries
- Clean production build verified

**Notes:**
- `KeybindHint` hover overlays deferred — keybind discoverability already covered by command palette (`?`) + sidebar shortcut hints
- Mute in Gmail = archive; true mute (ignore future replies) would need a custom label or the `ignore` API which doesn't exist in basic Gmail API — archive is the practical equivalent
- `CommandPalette` groups bindings by action name matching, not by a new field — keeps bindings.ts simple

**All phases complete.** Project is ready for testing and troubleshooting.

### 2026-03-24 — Keybind Settings Panel + Favicon

**What was done:**
- `lib/store/keybindStore.ts` (new): Zustand store with `persist` middleware — stores user keybind overrides as `Record<action, key>` in localStorage key `vimmail-keybinds`. Provides `getEffectiveBindings()` (defaults + overrides merged) and `findConflicts()` (checks mode overlap).
- `lib/keybinds/bindings.ts`: Added `category: KeyCategory` field (`navigation` | `go` | `actions` | `visual` | `general`) and `isEditable()` helper (single-char keys only). Added missing bindings: `h` (scrollLeft), `[` (prevThread), `]` (nextThread).
- `lib/keybinds/useKeybinds.ts`: Major refactor — separated action logic into `actionHandlers` map keyed by action name, then builds tinykeys handler map dynamically from `getEffectiveBindings()`. Same-key actions are chained; mode guards prevent double-fire. Subscribes to `overridesKey` (JSON.stringify of overrides) to re-register on change.
- `components/ui/SettingsPanel.tsx` (new): Right-side sliding panel (420px, full height, backdrop). All keybinds grouped by category. Single-char bindings show a clickable key badge — click to enter edit mode (pulses blue, shows "…"), press any single character to rebind. Conflict detection shows inline red error and blocks save. Per-binding reset (↺) and "Reset all" buttons. Capture-phase keydown listener blocks tinykeys while open; Escape cancels edit or closes panel.
- `lib/store/uiStore.ts`: Added `settingsOpen` / `setSettingsOpen`.
- `components/layout/Topbar.tsx`: Added gear SVG icon button (opens settings panel) between search bar and avatar.
- `components/ui/CommandPalette.tsx`: Updated to use `getEffectiveBindings()` so displayed keys reflect current overrides.
- `app/icon.svg` (new): SVG favicon — blue envelope on dark rounded square, matches app color scheme.
- `app/(app)/[label]/page.tsx`: Dynamic `document.title` via `useEffect` — e.g. "Inbox — VimMail", "Trash — VimMail", `Inbox — "query" — VimMail`. Maps internal label IDs (INBOX, STARRED, etc.) to display names.

**Architecture notes:**
- Keybind overrides persist in localStorage indefinitely (no expiry) — single user, personal app
- `useKeybinds` re-registers tinykeys whenever overrides change (dep: `JSON.stringify(overrides)`)
- Multi-key sequences (`g i`, `g g`) and special keys (`Enter`, `Escape`) are shown in settings but locked (not editable) — `isEditable()` returns false for `key.length !== 1`
- `labelPicker` action retains dual behavior: opens picker in LIST pane, scrolls right in DETAIL pane

### 2026-03-27 — EmailRow Subject Ellipsis Fix

**What was done:**
- Fixed EmailRow layout bug where long subject lines didn't ellipsis before the date, pushing it off-screen
- Changed subject span from `shrink-0` to `truncate` in `components/mail/EmailRow.tsx` — allows subject to shrink and ellipsis when row is crowded
- Date now always visible; subject and snippet both properly truncate with ellipsis when needed

**Notes:**
- Root cause: `shrink-0` prevented the subject from shrinking, forcing it to take full width and pushing date off-screen
- `truncate` class adds `text-overflow: ellipsis` + `overflow: hidden`, matching snippet behavior
- The `min-w-0` on flex container allows proper shrink participation
