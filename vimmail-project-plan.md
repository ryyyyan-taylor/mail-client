# VimMail — Complete Implementation Specification

A keyboard-first, vim-inspired web email client built on the Gmail API. Read + triage focused (no compose in v1). Self-hosted on Proxmox.

---

## Table of Contents

1. [Stack & Dependencies](#stack--dependencies)
2. [Project Structure](#project-structure)
3. [Go Backend Specification](#go-backend-specification)
4. [SvelteKit Frontend Specification](#sveltekit-frontend-specification)
5. [Keybind Engine Specification](#keybind-engine-specification)
6. [Theme System Specification](#theme-system-specification)
7. [Data Flow & Sync](#data-flow--sync)
8. [Database Schema](#database-schema)
9. [API Contract (Go ↔ SvelteKit)](#api-contract)
10. [Gmail API Integration Details](#gmail-api-integration-details)
11. [Docker & Deployment](#docker--deployment)
12. [Implementation Order](#implementation-order)
13. [Design Decisions & Rationale](#design-decisions--rationale)

---

## Stack & Dependencies

### Backend: Go

```
go 1.22+

Dependencies:
  google.golang.org/api v0.210+         # Gmail API client
  golang.org/x/oauth2                    # OAuth2 flow
  modernc.org/sqlite                     # Pure-Go SQLite (no CGO needed)
  github.com/go-chi/chi/v5              # HTTP router
  github.com/go-chi/cors                # CORS middleware
  github.com/joho/godotenv              # Env config loading
  github.com/rs/zerolog                 # Structured logging
```

### Frontend: SvelteKit + TypeScript

```
SvelteKit 2.x (Svelte 5)
TypeScript 5.x
Tailwind CSS 3.x
DOMPurify                               # HTML email sanitization
date-fns                                # Date formatting
```

### Infrastructure

| Component | Technology |
|-----------|-----------|
| Database | SQLite (file-based, single-user) |
| Auth | Google OAuth2, tokens stored server-side in SQLite |
| Real-time | Gmail Push Notifications (Pub/Sub) → SSE to frontend |
| Search | Gmail API native search (forwarded through Go proxy) |
| Threading | Toggleable — threaded by default, flat available |
| Container | Docker multi-stage build (Go binary + SvelteKit static) |
| Reverse proxy | Nginx (optional, for existing setups) |

---

## Project Structure

```
vimmail/
├── docker-compose.yml
├── Dockerfile                          # Multi-stage: Go build + SvelteKit build
├── Makefile                            # dev, build, test, deploy targets
├── README.md
├── .env.example                        # Template for required env vars
│
├── server/                             # Go backend
│   ├── go.mod
│   ├── go.sum
│   ├── cmd/
│   │   └── vimmail/
│   │       └── main.go                 # Entry point, server startup
│   ├── internal/
│   │   ├── config/
│   │   │   └── config.go              # Env-based configuration struct
│   │   ├── auth/
│   │   │   ├── oauth.go               # OAuth2 flow (consent URL, callback, token exchange)
│   │   │   ├── session.go             # Session management (secure cookies + session store)
│   │   │   └── middleware.go          # Auth middleware for protected routes
│   │   ├── gmail/
│   │   │   ├── client.go             # Gmail API client wrapper (per-user service creation)
│   │   │   ├── messages.go           # List, get, modify, trash, delete messages
│   │   │   ├── threads.go            # Thread operations + flat message listing
│   │   │   ├── labels.go             # Label CRUD + message labeling
│   │   │   ├── drafts.go             # STUBBED — placeholder for future compose
│   │   │   ├── batch.go              # Batch request handler (bulk modify/trash/delete)
│   │   │   └── search.go            # Search query proxy (forward Gmail search operators)
│   │   ├── push/
│   │   │   ├── pubsub.go            # Google Pub/Sub webhook receiver
│   │   │   └── sse.go               # SSE broadcaster (fan-out to connected clients)
│   │   ├── cache/
│   │   │   ├── db.go                # SQLite connection, migrations, helpers
│   │   │   ├── messages.go          # Message metadata cache CRUD
│   │   │   └── sync.go             # Incremental sync via Gmail history ID
│   │   └── api/
│   │       ├── router.go            # Chi router setup, middleware chain
│   │       ├── handlers.go          # HTTP request handlers (calls gmail/cache packages)
│   │       └── responses.go         # Standardized JSON response/error helpers
│
├── client/                            # SvelteKit frontend
│   ├── package.json
│   ├── svelte.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── app.html
│   │   ├── app.css                    # Tailwind directives + CSS variable defs
│   │   ├── lib/
│   │   │   ├── keybinds/
│   │   │   │   ├── engine.ts          # Core keybind engine (modal state machine)
│   │   │   │   ├── modes.ts           # Mode definitions (normal, visual, command, search)
│   │   │   │   ├── actions.ts         # Action registry (delete, archive, move, etc.)
│   │   │   │   ├── keymap.ts          # Default keymap + user override merging
│   │   │   │   ├── parser.ts          # Vim-style key sequence parser (counts, motions)
│   │   │   │   └── context.ts         # Context-aware binding resolution
│   │   │   ├── stores/
│   │   │   │   ├── mail.ts            # Message/thread list state + pagination
│   │   │   │   ├── selection.ts       # Visual mode selection state + cursor position
│   │   │   │   ├── labels.ts          # Label/folder list state
│   │   │   │   ├── view.ts            # Thread vs flat toggle + user preference
│   │   │   │   ├── ui.ts              # Sidebar visibility, density, panel state
│   │   │   │   ├── search.ts          # Search query + results + history
│   │   │   │   ├── undo.ts            # Undo stack for optimistic updates
│   │   │   │   └── keybinds.ts        # Active mode, pending keys, user keymap overrides
│   │   │   ├── api/
│   │   │   │   ├── client.ts          # Fetch wrapper (base URL, error handling, auth)
│   │   │   │   ├── messages.ts        # Message API calls
│   │   │   │   ├── threads.ts         # Thread API calls
│   │   │   │   ├── labels.ts          # Label API calls
│   │   │   │   └── sse.ts             # SSE connection manager (auto-reconnect)
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Sidebar.svelte          # Label/folder navigation
│   │   │   │   │   ├── Header.svelte           # Search bar, account info, settings link
│   │   │   │   │   ├── CommandPalette.svelte   # ":" command mode overlay
│   │   │   │   │   ├── StatusBar.svelte        # Current mode, pending keys, message counts
│   │   │   │   │   └── KeybindHint.svelte      # Contextual shortcut help ("?" overlay)
│   │   │   │   ├── mail/
│   │   │   │   │   ├── MessageList.svelte      # Inbox/label message list (virtual scroll)
│   │   │   │   │   ├── MessageRow.svelte       # Individual message row (selected/cursor state)
│   │   │   │   │   ├── ThreadView.svelte       # Expanded thread/conversation view
│   │   │   │   │   ├── FlatView.svelte         # Non-threaded individual message view
│   │   │   │   │   ├── ViewToggle.svelte       # Thread ↔ Flat toggle indicator
│   │   │   │   │   ├── MessageContent.svelte   # Individual message body rendering
│   │   │   │   │   └── AttachmentChip.svelte   # Attachment display/download
│   │   │   │   ├── compose/                    # STUBBED — future implementation
│   │   │   │   │   ├── ComposeModal.svelte     # Placeholder: shows "coming soon" message
│   │   │   │   │   └── README.md               # Compose feature roadmap
│   │   │   │   ├── search/
│   │   │   │   │   ├── SearchBar.svelte        # Search input with Gmail operator hints
│   │   │   │   │   └── SearchResults.svelte    # Filtered results view
│   │   │   │   ├── common/
│   │   │   │   │   ├── LabelPicker.svelte      # Label selection modal (for m/l keybinds)
│   │   │   │   │   ├── UndoToast.svelte        # Undo notification with countdown
│   │   │   │   │   └── ConfirmDialog.svelte    # Confirmation for destructive actions
│   │   │   │   └── settings/
│   │   │   │       ├── KeybindEditor.svelte    # Visual keybind configuration
│   │   │   │       ├── ThemeEditor.svelte      # Theme customization
│   │   │   │       └── GeneralSettings.svelte  # Density, default view mode, etc.
│   │   │   ├── themes/
│   │   │   │   ├── engine.ts          # CSS variable application + persistence
│   │   │   │   ├── types.ts           # Theme type definitions
│   │   │   │   ├── default.ts         # Gmail-inspired light theme
│   │   │   │   ├── dark.ts            # Dark theme
│   │   │   │   ├── nord.ts            # Nord color scheme
│   │   │   │   └── catppuccin.ts      # Catppuccin (mocha variant)
│   │   │   └── utils/
│   │   │       ├── gmail-search.ts    # Gmail search operator helpers/autocomplete
│   │   │       ├── date.ts            # Relative date formatting ("2h ago", "Yesterday")
│   │   │       └── html-sanitize.ts   # DOMPurify wrapper for email HTML
│   │   └── routes/
│   │       ├── +layout.svelte         # Root layout: sidebar + header + main + status bar
│   │       ├── +layout.server.ts      # Auth check, redirect to /auth/login if no session
│   │       ├── +page.svelte           # Inbox (default view) — renders MessageList
│   │       ├── auth/
│   │       │   ├── login/+page.svelte         # Login page with "Sign in with Google" button
│   │       │   └── callback/+server.ts        # OAuth callback → exchanges code → sets cookie
│   │       ├── label/
│   │       │   └── [id]/+page.svelte          # Label-filtered message list view
│   │       ├── thread/
│   │       │   └── [id]/+page.svelte          # Thread detail view (or flat if toggled)
│   │       ├── search/
│   │       │   └── +page.svelte               # Search results page
│   │       └── settings/
│   │           └── +page.svelte               # Settings page
│   └── static/
│       └── favicon.svg
│
├── configs/
│   ├── vimmail.example.toml           # Example config file
│   └── nginx.conf                     # Reverse proxy config (optional)
│
└── docs/
    ├── keybinds.md                    # Full keybind reference for users
    ├── architecture.md                # High-level architecture docs
    └── gmail-api.md                   # API quota info + integration notes
```

---

## Go Backend Specification

### Configuration (`internal/config/config.go`)

All config via environment variables:

```go
type Config struct {
    // Server
    Port            int    `env:"VIMMAIL_PORT" default:"8080"`
    Host            string `env:"VIMMAIL_HOST" default:"0.0.0.0"`
    BaseURL         string `env:"VIMMAIL_BASE_URL" default:"http://localhost:5173"` // Frontend URL

    // Google OAuth
    GoogleClientID     string `env:"GOOGLE_CLIENT_ID" required:"true"`
    GoogleClientSecret string `env:"GOOGLE_CLIENT_SECRET" required:"true"`
    GoogleRedirectURI  string `env:"GOOGLE_REDIRECT_URI" default:"http://localhost:8080/auth/callback"`

    // Database
    DBPath          string `env:"VIMMAIL_DB_PATH" default:"./data/vimmail.db"`

    // Session
    SessionSecret   string `env:"VIMMAIL_SESSION_SECRET" required:"true"` // 32+ byte random string
    SessionMaxAge   int    `env:"VIMMAIL_SESSION_MAX_AGE" default:"604800"` // 7 days

    // Push notifications (optional)
    PubSubProject   string `env:"GOOGLE_PUBSUB_PROJECT"`
    PubSubTopic     string `env:"GOOGLE_PUBSUB_TOPIC"`
}
```

Required `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8080/auth/callback
VIMMAIL_SESSION_SECRET=generate-a-random-32-byte-string-here
VIMMAIL_BASE_URL=http://localhost:5173
VIMMAIL_PORT=8080
VIMMAIL_DB_PATH=./data/vimmail.db
```

### Google Cloud Console Setup (prerequisite before any code runs)

1. Go to https://console.cloud.google.com/
2. Create a new project (or use existing)
3. Enable the **Gmail API**
4. Go to **APIs & Services → Credentials**
5. Create an **OAuth 2.0 Client ID** (Web application type)
6. Set authorized redirect URI to `http://localhost:8080/auth/callback`
7. Copy Client ID and Client Secret to `.env`
8. Under **OAuth consent screen**: add scope `https://mail.google.com/`
9. For development: set app to "Testing" and add your Google account as a test user

### OAuth2 Flow (`internal/auth/oauth.go`)

```
GET /auth/login
  → Generates OAuth consent URL with scopes:
    - https://mail.google.com/ (full Gmail access — needed for modify/delete)
  → state parameter: random string stored in session for CSRF
  → Redirects user to Google consent screen

GET /auth/callback?code=...&state=...
  → Validates state parameter
  → Exchanges code for access_token + refresh_token
  → Stores tokens in SQLite (encrypted with SESSION_SECRET)
  → Creates session cookie (httpOnly, secure, sameSite=lax)
  → Redirects to frontend base URL

GET /auth/logout
  → Clears session cookie + removes tokens from SQLite
  → Redirects to /auth/login

GET /auth/status
  → Returns { authenticated: bool, email: string }
```

### Session Management (`internal/auth/session.go`)

- Sessions stored in SQLite `sessions` table
- Session ID in httpOnly cookie named `vimmail_session`
- Each session maps to stored OAuth tokens
- Token refresh happens transparently when access_token expires
- If refresh fails → session invalidated → frontend redirects to login

### Auth Middleware (`internal/auth/middleware.go`)

- Checks `vimmail_session` cookie
- Loads session from SQLite
- Verifies/refreshes OAuth token
- Attaches Gmail API service to request context via `context.WithValue`
- Returns 401 if invalid

### Gmail Package Functions

**client.go:**
```go
func ServiceFromContext(ctx context.Context) (*gmail.Service, error)
```

**messages.go:**
```go
func ListMessages(svc *gmail.Service, query string, pageToken string, maxResults int64) (*MessageListResponse, error)
func GetMessage(svc *gmail.Service, messageID string) (*Message, error)
func ModifyMessage(svc *gmail.Service, messageID string, addLabels []string, removeLabels []string) error
func TrashMessage(svc *gmail.Service, messageID string) error
func DeleteMessage(svc *gmail.Service, messageID string) error
```

**threads.go:**
```go
func ListThreads(svc *gmail.Service, query string, pageToken string, maxResults int64) (*ThreadListResponse, error)
func GetThread(svc *gmail.Service, threadID string) (*Thread, error)
func ModifyThread(svc *gmail.Service, threadID string, addLabels []string, removeLabels []string) error
func TrashThread(svc *gmail.Service, threadID string) error
```

**batch.go:**
```go
func BatchModify(svc *gmail.Service, messageIDs []string, addLabels []string, removeLabels []string) error
func BatchTrash(svc *gmail.Service, messageIDs []string) error
func BatchDelete(svc *gmail.Service, messageIDs []string) error
```

**labels.go:**
```go
func ListLabels(svc *gmail.Service) ([]*Label, error)
func CreateLabel(svc *gmail.Service, name string) (*Label, error)
func DeleteLabel(svc *gmail.Service, labelID string) error
func UpdateLabel(svc *gmail.Service, labelID string, name string) (*Label, error)
```

**search.go:**
```go
func Search(svc *gmail.Service, query string, pageToken string, maxResults int64) (*MessageListResponse, error)
```

### Cache Layer (`internal/cache/`)

**db.go:** SQLite connection + auto-migration on startup.

**messages.go:**
```go
func CacheMessage(db *sql.DB, msg *CachedMessage) error
func GetCachedMessage(db *sql.DB, messageID string) (*CachedMessage, error)
func GetCachedMessageList(db *sql.DB, labelID string, limit int, offset int) ([]*CachedMessage, error)
func InvalidateMessage(db *sql.DB, messageID string) error
func InvalidateAll(db *sql.DB) error
```

**sync.go:**
```go
func IncrementalSync(db *sql.DB, svc *gmail.Service, lastHistoryID uint64) (newHistoryID uint64, err error)
func FullSync(db *sql.DB, svc *gmail.Service, labelID string) error
```

### SSE Broadcaster (`internal/push/sse.go`)

```go
type SSEBroker struct {
    clients map[chan SSEEvent]bool
    mu      sync.RWMutex
}

type SSEEvent struct {
    Type string      `json:"type"` // "message_added", "message_modified", "message_deleted"
    Data interface{} `json:"data"`
}

func (b *SSEBroker) Subscribe() chan SSEEvent
func (b *SSEBroker) Unsubscribe(ch chan SSEEvent)
func (b *SSEBroker) Broadcast(event SSEEvent)
func (b *SSEBroker) ServeHTTP(w http.ResponseWriter, r *http.Request)
```

### Full Route Table (`internal/api/router.go`)

```
Public (no auth):
  GET  /auth/login              → Google OAuth consent redirect
  GET  /auth/callback           → OAuth code exchange
  GET  /health                  → Health check

Protected (auth middleware):
  GET  /auth/status             → { authenticated, email }
  POST /auth/logout             → Clear session

  GET  /api/messages            → List messages (query params: label, pageToken, maxResults, view=threaded|flat)
  GET  /api/messages/:id        → Get single message with body
  POST /api/messages/:id/modify → Modify labels { addLabels[], removeLabels[] }
  POST /api/messages/:id/trash  → Trash message
  DELETE /api/messages/:id      → Permanently delete

  POST /api/messages/batch/modify  → Batch modify { ids[], addLabels[], removeLabels[] }
  POST /api/messages/batch/trash   → Batch trash { ids[] }
  POST /api/messages/batch/delete  → Batch delete { ids[] }

  GET  /api/threads             → List threads (query params: query, pageToken, maxResults)
  GET  /api/threads/:id         → Get full thread with all messages

  GET  /api/labels              → List all labels
  POST /api/labels              → Create label { name }
  PUT  /api/labels/:id          → Update label { name }
  DELETE /api/labels/:id        → Delete label

  GET  /api/search              → Search messages (query params: q, pageToken, maxResults)

  GET  /api/events              → SSE endpoint for real-time updates

  GET  /api/settings            → Get user settings
  PUT  /api/settings            → Save user settings
```

### Response Format

```json
// Success
{
  "data": { ... },
  "meta": { "nextPageToken": "...", "resultSizeEstimate": 150 }
}

// Error
{
  "error": { "code": 400, "message": "Invalid label ID" }
}
```

### Entry Point (`cmd/vimmail/main.go`)

```go
func main() {
    // 1. Load config from env / .env file
    // 2. Initialize SQLite database + run migrations
    // 3. Create SSE broker
    // 4. Build chi router with all routes + middleware
    // 5. Start HTTP server
    // 6. Graceful shutdown on SIGINT/SIGTERM
}
```

---

## SvelteKit Frontend Specification

### Layout Structure

Root layout (`+layout.svelte`) — Gmail-like three-panel layout:

```
┌──────────────────────────────────────────────────────────┐
│ Header: Search bar | Account | Settings                  │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │  Main Content Area                          │
│            │  (MessageList / ThreadView / FlatView)       │
│  Labels:   │                                             │
│  - Inbox   │  ┌─────────────────────────────────────┐    │
│  - Starred │  │ MessageRow (cursor here)   ███████  │    │
│  - Sent    │  │ MessageRow                          │    │
│  - Drafts  │  │ MessageRow (selected)      ███████  │    │
│  - Trash   │  │ MessageRow (selected)      ███████  │    │
│  - Spam    │  │ MessageRow                          │    │
│  - Custom  │  └─────────────────────────────────────┘    │
│            │                                             │
├────────────┴─────────────────────────────────────────────┤
│ StatusBar: [NORMAL] | Pending: d_ | 3 selected | 150msg │
└──────────────────────────────────────────────────────────┘
```

**Cursor** (highlighted row) is distinct from **selection** (checked rows). In normal mode, cursor = single active item. In visual mode, selected rows get a different highlight.

### Store Specifications

#### `mail.ts`

```typescript
interface MessageSummary {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  subject: string;
  snippet: string;
  labelIds: string[];
  isRead: boolean;
  isStarred: boolean;
  date: string;              // ISO 8601
  hasAttachments: boolean;
  messageCount?: number;     // Thread message count (threaded view only)
}

interface MailState {
  messages: MessageSummary[];
  loading: boolean;
  error: string | null;
  nextPageToken: string | null;
  currentLabel: string;
  totalEstimate: number;
}

// Actions: fetchMessages, fetchMore, removeMessages, restoreMessages, updateMessage
```

#### `selection.ts`

```typescript
interface SelectionState {
  cursorIndex: number;
  selectedIds: Set<string>;
  anchorIndex: number | null;   // Visual-line anchor
}

// Actions: moveCursor, moveCursorTo, toggleSelect, visualToggle, visualRange, clearSelection
// getSelectedOrCurrent() → returns selected IDs, or just cursor's message ID if no selection
```

#### `view.ts`

```typescript
interface ViewState {
  mode: 'threaded' | 'flat';
  currentThreadId: string | null;
  currentMessageId: string | null;
}

// Actions: toggleViewMode, openThread, openMessage, goBack
```

#### `undo.ts`

```typescript
interface UndoEntry {
  id: string;
  description: string;           // "Trashed 5 messages"
  reverseAction: () => Promise<void>;
  restoreUI: () => void;
  timestamp: number;
  expiresAt: number;             // +10 seconds
}

// 10-second undo window. Auto-finalize after expiry.
// Ctrl+z or clicking "Undo" in toast triggers reverseAction + restoreUI.
```

#### `keybinds.ts`

```typescript
interface KeybindState {
  mode: 'normal' | 'visual' | 'visual-line' | 'command' | 'search';
  pendingKeys: string;
  count: number | null;
  lastAction: Action | null;   // For dot-repeat
  userOverrides: KeyMap;
}
```

#### `search.ts`

```typescript
interface SearchState {
  query: string;
  results: MessageSummary[];
  loading: boolean;
  nextPageToken: string | null;
  history: string[];
  isActive: boolean;
}
```

#### `labels.ts`

```typescript
interface Label {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
  color?: { textColor: string; backgroundColor: string };
}
```

### API Client (`lib/api/client.ts`)

```typescript
const API_BASE = '/api'; // Proxied to Go server in dev via Vite proxy config

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/auth/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'API error');
  }
  return res.json();
}
```

### SSE Client (`lib/api/sse.ts`)

```typescript
class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectDelay = 1000;

  connect() {
    this.eventSource = new EventSource('/api/events', { withCredentials: true });
    this.eventSource.addEventListener('message_added', (e) => { /* update mail store */ });
    this.eventSource.addEventListener('message_modified', (e) => { /* update mail store */ });
    this.eventSource.addEventListener('message_deleted', (e) => { /* update mail store */ });
    this.eventSource.onerror = () => {
      setTimeout(() => this.connect(), this.reconnectDelay);
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };
    this.eventSource.onopen = () => { this.reconnectDelay = 1000; };
  }

  disconnect() { this.eventSource?.close(); }
}
```

### Component Specifications

**MessageList.svelte**: Virtual scrolling for large lists. Renders MessageRow components. Handles scroll-into-view when cursor moves off-screen. Infinite scroll via pageToken.

**MessageRow.svelte**: Layout: `[★] [Checkbox] From — Subject — snippet... Date`. Props: `message`, `isCursor`, `isSelected`, `density`. Unread = bold. Cursor = `cursor.bg` color. Selected = `selection.bg` color. Checkbox visible in visual mode only.

**ThreadView.svelte**: All messages in thread, collapsed by default (latest expanded). `o` expand/collapse individual. `O` expand/collapse all. `n`/`p` navigate messages. `u` returns to list.

**FlatView.svelte**: Single message view without thread context. `u` returns to list.

**CommandPalette.svelte**: `:` activates. Bottom-of-screen text input (like vim). Commands: `:move <label>`, `:label <label>`, `:unlabel <label>`, `:search <query>`, `:trash`, `:archive`, `:read`, `:unread`. Tab completion for labels. Command history with up/down. Escape closes.

**StatusBar.svelte**: Always visible at bottom. Shows: `[MODE] | Pending: d_ | Selection: 3 messages | Label: Inbox (150)`. Mode indicator color changes per mode (normal/visual/command).

**LabelPicker.svelte**: Modal triggered by `m` (move) or `l` (label). Type-ahead filter. `j`/`k` navigation. Enter to select. Escape to cancel. `m` = remove from current + add to selected. `l` = add label only.

**UndoToast.svelte**: Bottom-right slide-in. Shows description + 10s countdown. "Undo" button or Ctrl+z triggers undo. Auto-dismiss on expiry.

---

## Keybind Engine Specification

### Modes

| Mode | Entry | Behavior |
|------|-------|----------|
| **Normal** | Default / `Escape` | Single-key actions on cursor message. `j`/`k` navigate. |
| **Visual** | `v` | Toggle per-item selection with j/k movement. |
| **Visual-Line** | `V` | Range select: anchor at entry point → cursor. |
| **Command** | `:` | Colon-command input at bottom of screen. |
| **Search** | `/` | Search input with type-ahead. |
| **Insert** | *(reserved for future compose)* | Not active in v1. |

### Mode Transitions

```
                    ┌─────────┐
           Escape   │         │  v / V
          ┌─────────│ NORMAL  │────────┐
          │         │         │        │
          │         └─┬───┬───┘        ▼
          │       :   │   │  /    ┌──────────┐
          │           │   │       │ VISUAL / │
          │           ▼   ▼       │ VIS-LINE │
          │    ┌───────┐ ┌───────┐└──────────┘
          ├────│COMMAND│ │SEARCH │      │
          │    └───────┘ └───────┘      │ Escape
          │       Enter    Enter        │
          └─────────────────────────────┘
```

### Engine Architecture (`engine.ts`)

```typescript
class KeybindEngine {
  private mode: Mode = 'normal';
  private pendingKeys: string = '';
  private count: number | null = null;
  private lastAction: { action: string; count: number; motion: string } | null = null;
  private keymap: ResolvedKeyMap;
  private context: KeyContext;

  constructor(defaultKeymap: KeyMap, userOverrides: KeyMap) {
    this.keymap = mergeKeymaps(defaultKeymap, userOverrides);
  }

  // Attached to window keydown. Returns true if event consumed (preventDefault).
  handleKey(event: KeyboardEvent): boolean {
    // 1. If in command/search mode → route to those handlers
    // 2. If focus in text input (except Escape) → yield to input
    // 3. Check for count prefix (0-9, not 0 as first key)
    // 4. Append to pendingKeys
    // 5. Resolve against keymap for mode + context:
    //    - Exact match → execute, clear pending
    //    - Prefix match → wait (show in status bar)
    //    - No match → clear pending, flash status bar
  }

  setMode(mode: Mode) { ... }
  setContext(context: KeyContext) { ... }
  getState(): KeybindState { ... }
}
```

### Key Sequence Parser (`parser.ts`)

```typescript
interface ParsedSequence {
  count: number | null;
  action: string | null;
  motion: string | null;
}

// "j"   → { count: null, action: null, motion: 'j' }       → move down 1
// "5j"  → { count: 5,    action: null, motion: 'j' }       → move down 5
// "d"   → pending...
// "dj"  → { count: null, action: 'd',  motion: 'j' }       → delete current + 1 below
// "d3j" → { count: null, action: 'd',  motion: '3j' }      → delete current + 3 below
// "3dj" → { count: 3,    action: 'd',  motion: 'j' }       → same as d3j
// "dG"  → { count: null, action: 'd',  motion: 'G' }       → delete cursor to bottom
// "dgg" → { count: null, action: 'd',  motion: 'gg' }      → delete cursor to top
// "."   → repeats lastAction
```

### Action Registry (`actions.ts`)

```typescript
interface Action {
  id: string;
  label: string;
  description: string;
  execute: (targets: string[], context: ActionContext) => Promise<void>;
  undoable: boolean;
  requiresConfirmation: boolean;
  contexts: KeyContext[];       // 'list' | 'thread' | 'search' | 'command' | 'modal'
}

// Registered actions:
// trash:        undoable, no confirm,  contexts: [list, thread]
// delete:       not undoable, confirm, contexts: [list, thread]
// archive:      undoable, no confirm,  contexts: [list, thread]
// star:         undoable, no confirm,  contexts: [list, thread]
// spam:         undoable, no confirm,  contexts: [list, thread]
// mark-read:    undoable, no confirm,  contexts: [list, thread]
// mark-unread:  undoable, no confirm,  contexts: [list, thread]
// move:         undoable, no confirm,  contexts: [list, thread] → opens LabelPicker
// label:        undoable, no confirm,  contexts: [list, thread] → opens LabelPicker
// open:         not undoable,          contexts: [list]
// back:         not undoable,          contexts: [thread]
// toggle-expand: not undoable,         contexts: [thread]
// expand-all:   not undoable,          contexts: [thread]
// toggle-view:  not undoable,          contexts: [list, thread]
```

### Default Keymap (`keymap.ts`)

```
Navigation (Normal mode):
  j / k          → cursor down / up
  J / K          → cursor down / up by 5
  gg             → cursor to top
  G              → cursor to bottom
  Enter          → open thread/message (list context)
  u / Backspace  → back to list (thread context)

Actions (Normal + Visual + Visual-Line):
  d / #          → trash
  D              → permanent delete (with confirm dialog)
  e / y          → archive
  s              → star/unstar toggle
  !              → mark spam
  m              → move to label (opens picker)
  l              → add label (opens picker)
  x              → toggle checkbox select (Normal only, non-modal)

Visual Mode:
  v              → enter visual mode (Normal → Visual)
  V              → enter visual-line mode (Normal → Visual-Line)
  Escape         → exit visual, clear selection (Visual/VL → Normal)
  j / k          → extend/contract selection

Thread Navigation (Normal, thread context):
  o              → expand/collapse message
  O              → expand/collapse all
  n / p          → next/prev message in thread

View:
  t              → toggle threaded ↔ flat view

Utility:
  /              → enter search mode
  :              → enter command mode
  ?              → show keybind help overlay
  .              → repeat last action (with original count/motion)
  zz             → center cursor row in viewport
  Ctrl+z         → undo last action

Compose Stubs (reserved, show "coming soon"):
  c              → new message placeholder
  r              → reply placeholder (thread context)
  R              → reply-all placeholder (thread context)
  f              → forward placeholder (thread context)
```

### Key Event Handling Rules

1. **preventDefault only on consumed keys** — let Ctrl+C, Ctrl+V, F5, etc. through.
2. **Modifier keys**: `Ctrl+z` = string `"Ctrl+z"`. `Shift+j` = `"J"`.
3. **Input awareness**: If focus is in `<input>` or `<textarea>`, yield all keys EXCEPT `Escape` (always exits to normal).
4. **No timeout on multi-key sequences**: `gg` waits indefinitely after `g` (matches vim). Pending state shown in status bar.
5. **Context resolution priority**: modal > command > search > thread > list.

---

## Theme System Specification

### Type Definition (`themes/types.ts`)

```typescript
interface Theme {
  id: string;
  name: string;
  colors: {
    bg: { primary: string; secondary: string; tertiary: string; };
    fg: { primary: string; secondary: string; muted: string; };
    accent: { primary: string; hover: string; };
    border: string;
    selection: { bg: string; fg: string; };
    cursor: { bg: string; fg: string; };
    status: { normal: string; visual: string; command: string; };
    star: string;
    unread: string;
    semantic: { error: string; warning: string; success: string; info: string; };
  };
  density: 'compact' | 'default' | 'comfortable';
  font: { family: string; monoFamily: string; size: string; listSize: string; };
}
```

### Application (`themes/engine.ts`)

Flattens theme into CSS variables on `:root` (e.g., `--vm-bg-primary`, `--vm-cursor-bg`). Sets density class on body. Persists theme ID to localStorage.

### Presets

| Theme | bg.primary | accent.primary | Status normal |
|-------|-----------|---------------|--------------|
| Default (Gmail) | `#ffffff` | `#1a73e8` | `#1a73e8` |
| Dark | `#1a1a2e` | `#e94560` | `#e94560` |
| Nord | `#2e3440` | `#88c0d0` | `#88c0d0` |
| Catppuccin Mocha | `#1e1e2e` | `#cba6f7` | `#cba6f7` |

---

## Data Flow & Sync

### Initial Load

```
1. Navigate to /
2. +layout.server.ts → GET /auth/status
   ├── 401 → redirect to /auth/login
   └── 200 → proceed
3. +page.svelte onMount:
   a. mail.fetchMessages('INBOX') → GET /api/messages?label=INBOX&maxResults=50
   b. labels.fetchLabels() → GET /api/labels
   c. sseClient.connect() → GET /api/events (SSE stream)
   d. View store loads preference from localStorage
```

### Bulk Action (Visual Mode → Trash)

```
1. v → VISUAL mode
2. 5j → cursor moves down 5, selecting along the way
3. d → trash action
4. selection.getSelectedOrCurrent() → 6 message IDs
5. Optimistic update: remove from list, clear selection, push undo entry, show toast
6. POST /api/messages/batch/trash { ids: [...] }
7. Go server → gmail.BatchModify (add TRASH, remove INBOX) → update SQLite
8. If fails → restoreUI, show error
9. If user clicks Undo → POST /api/messages/batch/modify (remove TRASH, add INBOX)
```

### Real-time (Push)

```
1. Go server registers Gmail watch → Pub/Sub topic
2. New email → Google POSTs to webhook
3. Go server fetches history.list delta → updates SQLite → broadcasts SSE
4. Frontend SSE handler updates mail + labels stores
```

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type TEXT NOT NULL DEFAULT 'Bearer',
    expiry TEXT NOT NULL,
    email TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_id INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (token_id) REFERENCES auth_tokens(id)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    subject TEXT,
    snippet TEXT,
    from_name TEXT,
    from_email TEXT,
    to_addresses TEXT,                       -- JSON: [{name, email}]
    date TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    is_starred INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    label_ids TEXT NOT NULL DEFAULT '[]',    -- JSON array
    raw_size INTEGER,
    cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_date ON messages(date DESC);

CREATE TABLE IF NOT EXISTS message_bodies (
    message_id TEXT PRIMARY KEY,
    body_html TEXT,
    body_text TEXT,
    headers TEXT,                             -- JSON object
    attachments TEXT,                         -- JSON: [{id, filename, mimeType, size}]
    cached_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    messages_total INTEGER DEFAULT 0,
    messages_unread INTEGER DEFAULT 0,
    color_text TEXT,
    color_bg TEXT,
    cached_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    history_id INTEGER NOT NULL DEFAULT 0,
    last_full_sync TEXT,
    last_incremental_sync TEXT,
    push_watch_expiry TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL    -- JSON
);
```

**Label filtering**: Since `label_ids` is a JSON array, query with:
```sql
SELECT * FROM messages, json_each(messages.label_ids) WHERE json_each.value = ?
```

---

## API Contract — JSON Shapes

```typescript
interface APIMessageSummary {
  id: string;
  threadId: string;
  from: { name: string; email: string };
  to: { name: string; email: string }[];
  subject: string;
  snippet: string;
  labelIds: string[];
  isRead: boolean;
  isStarred: boolean;
  date: string;
  hasAttachments: boolean;
  messageCount?: number;
}

interface APIMessage extends APIMessageSummary {
  bodyHtml: string;
  bodyText: string;
  headers: Record<string, string>;
  attachments: { id: string; filename: string; mimeType: string; size: number; }[];
}

interface APIThread {
  id: string;
  subject: string;
  messages: APIMessage[];
  messageCount: number;
}

interface APILabel {
  id: string;
  name: string;
  type: 'system' | 'user';
  messagesTotal: number;
  messagesUnread: number;
  color?: { textColor: string; backgroundColor: string };
}

interface APIListResponse<T> {
  data: T[];
  meta: { nextPageToken?: string; resultSizeEstimate?: number; };
}

interface APIBatchRequest {
  ids: string[];
  addLabels?: string[];
  removeLabels?: string[];
}

interface APISettings {
  theme: string;
  density: string;
  defaultView: string;
  keybindOverrides: Record<string, string>;
}
```

---

## Gmail API Integration Details

### Scope

`https://mail.google.com/` — full access. Required for permanent delete. More granular scopes don't cover all operations.

### Quota

| Operation | Method | Cost |
|-----------|--------|------|
| List messages | `messages.list` | 5 |
| Get message | `messages.get` | 5 |
| Modify labels | `messages.modify` | 5 |
| Trash | `messages.trash` | 5 |
| Delete | `messages.delete` | 10 |
| Batch modify | `messages.batchModify` | 50 (up to 1000 IDs) |
| Batch delete | `messages.batchDelete` | 50 |
| List threads | `threads.list` | 5 |
| Get thread | `threads.get` | 5 |
| List labels | `labels.list` | 1 |
| History list | `history.list` | 2 |
| Watch (push) | `watch` | 0 |

**Limit**: 250 units/second per user. Always prefer batch over individual calls.

### Incremental Sync

1. First run: full sync of INBOX/SENT/STARRED/TRASH → store metadata in SQLite
2. Store `historyId` from most recent response
3. Subsequent loads: `history.list(startHistoryId=stored)` → returns changes only
4. History entries: `messagesAdded`, `messagesDeleted`, `labelsAdded`, `labelsRemoved`
5. Apply changes to cache, update `historyId`
6. If `historyId` too old (404) → trigger full sync

### Message MIME Parsing

Gmail `format=full` returns nested MIME. The Go server must:
1. Recursively walk MIME tree
2. Prefer `text/html`, fallback to `text/plain`
3. Extract attachment metadata (filename, size, MIME type, attachment ID)
4. Base64url-decode body
5. Return clean HTML + plain text to frontend
6. Frontend sanitizes HTML with DOMPurify before rendering

---

## Docker & Deployment

### Dockerfile

```dockerfile
FROM golang:1.22-alpine AS go-builder
WORKDIR /build
COPY server/ .
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o vimmail ./cmd/vimmail/

FROM node:20-alpine AS svelte-builder
WORKDIR /build
COPY client/ .
RUN npm ci
RUN npm run build

FROM alpine:3.19
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=go-builder /build/vimmail .
COPY --from=svelte-builder /build/build ./static
RUN mkdir -p /app/data
EXPOSE 8080
VOLUME ["/app/data"]
CMD ["./vimmail"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  vimmail:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - vimmail-data:/app/data
    env_file:
      - .env
    restart: unless-stopped
volumes:
  vimmail-data:
```

### Nginx (optional, for TLS)

```nginx
server {
    listen 443 ssl http2;
    server_name mail.yourdomain.com;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/events {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

### Proxmox Deployment

Run Docker in an LXC container (lightweight) or a small VM. The Go binary serves SvelteKit static files directly — no separate web server required. Nginx only needed for TLS termination.

---

## Implementation Order

### Phase 1: Foundation (Weeks 1–3)
**Goal**: Authenticate, fetch emails, navigate with j/k

- Go server: main.go, chi router, config, health check
- SQLite init + migrations
- OAuth2: /auth/login, /auth/callback, /auth/status, middleware
- Gmail proxy (read-only): messages.list, messages.get, threads.get, labels.list
- Cache layer: store metadata, basic freshness check
- SvelteKit: layout, auth guard, login page, OAuth callback route
- Tailwind + CSS variables foundation
- Stores: mail, labels, selection, view (basic)
- MessageList + MessageRow + ThreadView + FlatView + MessageContent
- DOMPurify HTML sanitization
- **Keybind engine v1**: Normal mode — j/k, J/K, gg/G, Enter, u, t (view toggle)
- StatusBar showing mode

### Phase 2: Core Actions (Weeks 4–5)
**Goal**: Trash, archive, star, label, move

- Gmail write ops: modify, trash, delete endpoints
- Batch endpoints: batch/modify, batch/trash, batch/delete
- Label CRUD endpoints
- Action dispatch system + action registry
- Optimistic updates in mail store
- Undo store + UndoToast
- LabelPicker (m and l keys)
- ConfirmDialog (D key)
- Mark read/unread, star toggle
- Compose stubs (c, r, R, f → "coming soon")

### Phase 3: Vim Power Features (Weeks 6–7)
**Goal**: Visual mode, bulk ops, compound commands

- Visual mode (v) + Visual-line mode (V)
- Selection highlighting + checkbox display
- All actions work on visual selection
- Bulk optimistic updates + bulk undo
- Key sequence parser: count prefix (5j), action+motion (dG, d3j)
- Pending key display in status bar
- Dot repeat (.)
- x (checkbox toggle, non-modal)

### Phase 4: Command Mode & Search (Weeks 8–9)
**Goal**: : commands and / search

- CommandPalette: parser, tab completion, history
- Commands: :move, :label, :unlabel, :search, :trash, :archive, :read, :unread
- Search: / activates SearchBar, Gmail operator hints, results view
- Search history
- KeybindHint overlay (? key)

### Phase 5: Polish & Real-time (Weeks 10–11)
**Goal**: Themes, push sync, customization

- Theme engine + 4 presets
- ThemeEditor component
- Google Pub/Sub webhook → SSE broadcaster → frontend SSE client
- Incremental sync (history ID deltas)
- KeybindEditor component
- GeneralSettings (density, default view)
- Settings persistence (GET/PUT /api/settings)
- Virtual scrolling for MessageList

### Phase 6: Deployment (Week 12)
**Goal**: Dockerized on Proxmox

- Multi-stage Dockerfile
- docker-compose.yml
- Go serves static SvelteKit files
- Nginx config for TLS
- README + setup docs + keybind reference

---

## Design Decisions & Rationale

**SvelteKit over React**: Svelte's reactivity handles complex keyboard state (mode, selection ranges, pending keys) without useEffect dependency arrays. Compiled output minimizes keypress-to-render latency.

**Go over Node.js**: Single binary, no runtime deps. Perfect for Proxmox. Excellent Gmail API client. Goroutines natural for concurrent batch operations. Low memory footprint.

**SQLite over PostgreSQL**: Single-user, self-hosted. No service dependency. Pure-Go driver (no CGO). Data is a cache — if lost, rebuilds from Gmail.

**Custom keybind engine**: No existing library supports modal state, visual selection, count prefixes, motion-action composition, context awareness, and dot-repeat together.

**SSE over WebSocket**: Unidirectional (server → client). Simpler, auto-reconnects, works through HTTP/2. Actions use REST.

**No compose in v1**: Compose (editor, contacts, attachments, drafts) is a separate project. V1 = read + triage where vim keybinds shine. Stubbed with reserved keybinds for v2.

**Gmail API only**: Richer metadata, push notifications, batch ops, native search vs IMAP. IMAP adaptable later via interface pattern.

**Markdown compose (future v2)**: Rich-text editors fight keyboard-first UX. Markdown + live preview stays keyboard-native.

**Vite dev proxy**: In development, SvelteKit dev server proxies `/api/*` to Go backend on :8080. In production, Go serves everything from one port.
