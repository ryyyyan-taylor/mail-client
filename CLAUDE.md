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
│   │   ├── Topbar.tsx                # Search bar, avatar
│   │   └── AppShell.tsx              # Sidebar + content layout wrapper
│   ├── mail/
│   │   ├── EmailList.tsx             # Virtualized list (TanStack Virtual)
│   │   ├── EmailRow.tsx              # Single row: sender, subject, snippet, date, star
│   │   ├── EmailDetail.tsx           # Read-only thread/message view
│   │   ├── SelectionBar.tsx          # Bulk action bar (visible when selection > 0)
│   │   └── LabelPicker.tsx           # Label assignment popover
│   └── ui/
│       ├── CommandPalette.tsx        # ? key: shows all keybinds
│       ├── KeybindHint.tsx           # Small kbd overlays on hover
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
│   │   ├── bindings.ts               # Central keybind config map (source of truth)
│   │   ├── useKeybinds.ts            # Hook: registers tinykeys listeners, respects mode
│   │   └── modes.ts                  # Mode enum + transition logic
│   └── store/
│       ├── mailStore.ts              # cursorIndex, selectionAnchor, selectedIds, activeThreadId
│       └── uiStore.ts                # commandPaletteOpen, labelPickerOpen, currentMode
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

HTML emails render in a sandboxed iframe:

```tsx
<iframe
  srcDoc={sanitizedHtml}
  sandbox="allow-popups allow-popups-to-escape-sandbox"
  className="w-full min-h-96 border-0"
  onLoad={(e) => {
    // auto-resize to content height
    const iframe = e.currentTarget
    iframe.style.height = iframe.contentDocument?.body.scrollHeight + "px"
  }}
/>
```

- Run body through DOMPurify before setting `srcDoc`
- `allow-popups` so links open in new tab; no `allow-scripts` — JS in emails is blocked
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
- [ ] All API routes in `/app/api/gmail/`
- [ ] `useMessages` hook with TanStack Query
- [ ] `EmailList` with TanStack Virtual
- [ ] `EmailRow` component (sender, subject, snippet, date, labels, star indicator)
- [ ] Infinite scroll via `pageToken`

### Phase 3 — Keyboard Navigation (NORMAL)
- [ ] Zustand stores (`mailStore`, `uiStore`)
- [ ] `useKeybinds` hook with `tinykeys`
- [ ] `j`/`k` cursor movement + visual highlight on rows
- [ ] `Enter` to open thread, `Escape` back to list
- [ ] `g *` prefix navigation between labels

### Phase 4 — Thread Detail View
- [ ] `useThread` hook
- [ ] `EmailDetail` component — thread message list, expandable messages
- [ ] HTML body rendering (iframe + DOMPurify)
- [ ] Plain text fallback
- [ ] `[` / `]` to navigate prev/next thread from detail view

### Phase 5 — Single-email Actions
- [ ] `useBulkActions` hook (works for single too — pass `[id]`)
- [ ] Archive (`e`), Trash (`#`), Spam (`!`), Star (`s`), Unread (`u`)
- [ ] Optimistic updates + rollback
- [ ] `Toast` component for feedback

### Phase 6 — Visual Mode + Bulk Actions
- [ ] Mode state machine in `uiStore`
- [ ] Visual mode keybinds + range selection logic
- [ ] `SelectionBar` with bulk action buttons
- [ ] Bulk archive/trash/spam/star/unread via `Promise.all`

### Phase 7 — Labels + Search
- [ ] Dynamic label list in `Sidebar` (from `/api/gmail/labels`)
- [ ] `LabelPicker` popover for `l` keybind
- [ ] Search bar in `Topbar` wired to `q=` Gmail param
- [ ] Update `useMessages` to accept search query

### Phase 8 — Polish
- [ ] `CommandPalette` component (triggered by `?`)
- [ ] `KeybindHint` overlays visible on hover
- [ ] Mute thread (`m`)
- [ ] Unread count badges on sidebar labels
- [ ] Loading/error states throughout

---

## Out of Scope (v1)

- No compose, reply, reply-all, or forward
- No send functionality whatsoever — `gmail.send` scope is not requested
- No offline mode or local email cache
- No push notifications (polling on window focus is acceptable)
- No calendar, Meet, or Chat integration
- No multi-account support
- No keyboard remap settings UI (bindings are in `bindings.ts` — edit the file)

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
