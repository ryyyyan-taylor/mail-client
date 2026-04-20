import type { ThreadListItem, GmailMessage } from "@/hooks/useMessages"
import type { GmailLabel } from "@/hooks/useLabels"

// base64url encode — demo data is ASCII-only
function b64(s: string): string {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function msg(
  id: string,
  threadId: string,
  from: string,
  to: string,
  subject: string,
  dateHeader: string,
  internalDate: string,
  labelIds: string[],
  snippet: string,
  body: string
): GmailMessage {
  return {
    id,
    threadId,
    labelIds,
    snippet,
    internalDate,
    payload: {
      mimeType: "text/plain",
      headers: [
        { name: "From", value: from },
        { name: "To", value: to },
        { name: "Subject", value: subject },
        { name: "Date", value: dateHeader },
      ],
      body: { data: b64(body), size: body.length },
    },
  }
}

// ─── Threads (inbox + starred) ───────────────────────────────────────────────

export const DEMO_THREADS: ThreadListItem[] = [
  {
    id: "demo_t1",
    snippet: "Alex Chen wants to merge 3 commits into main from feature/dark-mode. Changes: +847 −92 lines across 14 files.",
    historyId: "1001",
    message: msg(
      "demo_m1", "demo_t1",
      "GitHub <noreply@github.com>",
      "you@yourapp.dev",
      "[acme-corp/frontend] PR #124: Add dark mode support",
      "Mon, 20 Apr 2026 10:23:00 +0000",
      "1776679380000",
      ["INBOX", "UNREAD"],
      "Alex Chen wants to merge 3 commits into main from feature/dark-mode. Changes: +847 −92 lines across 14 files.",
      `Alex Chen wants to merge 3 commits into main from feature/dark-mode.

Changes: +847 −92 lines across 14 files

Review requested: @you

View pull request: https://github.com/acme-corp/frontend/pull/124

--
You are receiving this because you were requested to review this pull request.`
    ),
  },
  {
    id: "demo_t2",
    snippet: "A new high-priority issue was created in Acme Corp workspace. Login page crashes on mobile Safari 17 when session cookie is absent.",
    historyId: "1002",
    message: msg(
      "demo_m2", "demo_t2",
      "Linear <notifications@linear.app>",
      "you@yourapp.dev",
      "Bug [ACM-847]: Login page crashes on mobile Safari",
      "Mon, 20 Apr 2026 09:15:00 +0000",
      "1776674100000",
      ["INBOX", "UNREAD"],
      "A new high-priority issue was created in Acme Corp workspace. Login page crashes on mobile Safari 17 when session cookie is absent.",
      `New issue assigned to you

ACM-847 · Bug · High priority

Login page crashes on mobile Safari

The login page throws a TypeError when the session cookie is absent on Safari 17.
Affects roughly 12% of mobile users based on last week's error logs.

Assigned by: Jordan Park
Project: Q2 Hardening

View issue: https://linear.app/acme-corp/issue/ACM-847`
    ),
  },
  {
    id: "demo_t3",
    snippet: "Hey! Just checking in on the Q2 planning session. Can you join Wednesday at 2pm? We need to lock in the roadmap before the board meeting.",
    historyId: "1003",
    message: msg(
      "demo_m3", "demo_t3",
      "Sarah Kim <sarah.kim@company.io>",
      "you@yourapp.dev",
      "Re: Q2 planning — can you join Wednesday?",
      "Sun, 19 Apr 2026 17:42:00 +0000",
      "1776606120000",
      ["INBOX", "STARRED"],
      "Hey! Just checking in on the Q2 planning session. Can you join Wednesday at 2pm? We need to lock in the roadmap before the board meeting.",
      `Hey!

Just checking in on the Q2 planning session. Can you join Wednesday at 2pm? We need to lock in the roadmap before the board meeting on Thursday.

Priya said she'd send the Figma link beforehand. I'll grab a conference room.

Let me know,
Sarah`
    ),
  },
  {
    id: "demo_t4",
    snippet: "Your invoice for April 2026 is now available. Total due: $149.00. View and download your invoice from the billing portal.",
    historyId: "1004",
    message: msg(
      "demo_m4", "demo_t4",
      "Stripe <no-reply@stripe.com>",
      "you@yourapp.dev",
      "Your April invoice is ready",
      "Sun, 19 Apr 2026 14:30:00 +0000",
      "1776594600000",
      ["INBOX"],
      "Your invoice for April 2026 is now available. Total due: $149.00. View and download your invoice from the billing portal.",
      `Invoice available

Invoice #INV-2026-04-0087
Period: April 1 – April 30, 2026
Total: $149.00

  Starter plan (monthly)    $99.00
  Overage: 2.4M API calls   $50.00

Payment will be charged to Visa ···4242 on May 1, 2026.

View invoice: https://dashboard.stripe.com/invoices`
    ),
  },
  {
    id: "demo_t5",
    snippet: "Your AWS account (123456789012) has exceeded your $200 monthly billing alert. Current month-to-date charges: $247.83.",
    historyId: "1005",
    message: msg(
      "demo_m5", "demo_t5",
      "AWS <no-reply@aws.amazon.com>",
      "you@yourapp.dev",
      "Action Required: Billing alert threshold exceeded",
      "Sat, 18 Apr 2026 09:14:00 +0000",
      "1776503640000",
      ["INBOX", "UNREAD"],
      "Your AWS account (123456789012) has exceeded your $200 monthly billing alert. Current month-to-date charges: $247.83.",
      `AWS Billing Alert

Your AWS account (123456789012) has exceeded your billing alert threshold.

  Alert threshold:       $200.00
  Current MTD charges:   $247.83

Top services this month:
  EC2 (us-east-1)    $118.40
  RDS                 $74.22
  CloudFront          $31.50
  S3                  $23.71

To manage alerts: https://console.aws.amazon.com/billing/`
    ),
  },
  {
    id: "demo_t6",
    snippet: "Build failed for commit 3f8a21c on branch main. Error in /app/api/auth route — Module not found: @/lib/session. 2 checks failed.",
    historyId: "1006",
    message: msg(
      "demo_m6", "demo_t6",
      "Vercel <noreply@vercel.com>",
      "you@yourapp.dev",
      "Deployment failed — production (main)",
      "Sat, 18 Apr 2026 08:47:00 +0000",
      "1776502020000",
      ["INBOX"],
      "Build failed for commit 3f8a21c on branch main. Error in /app/api/auth route — Module not found: @/lib/session. 2 checks failed.",
      `Deployment failed

Project: acme-frontend
Environment: Production
Commit: 3f8a21c — "refactor: move session helper"
Branch: main

Error:
  Module not found: Can't resolve '@/lib/session'
  at /app/api/auth/[...nextauth]/route.ts:3

Build log: https://vercel.com/acme-corp/acme-frontend/deployments/abc123`
    ),
  },
  {
    id: "demo_t7",
    snippet: "Hi, please find attached Invoice #2847 for consulting services in April. Due date: May 5, 2026. Total: $3,200.00.",
    historyId: "1007",
    message: msg(
      "demo_m7", "demo_t7",
      "Marcus Webb <marcus@freelance.dev>",
      "you@yourapp.dev",
      "Invoice #2847 — April consulting",
      "Fri, 17 Apr 2026 16:05:00 +0000",
      "1776441900000",
      ["INBOX", "STARRED"],
      "Hi, please find attached Invoice #2847 for consulting services in April. Due date: May 5, 2026. Total: $3,200.00.",
      `Hi,

Please find attached Invoice #2847 for consulting services rendered in April 2026.

  API integration work (16h @ $150/hr)    $2,400.00
  Code review & documentation (8h)           $800.00
  ─────────────────────────────────────────────────
  Total                                    $3,200.00

Due date: May 5, 2026
Payment: Bank transfer to details on invoice

Thanks,
Marcus`
    ),
  },
  {
    id: "demo_t8",
    snippet: "Monitor alert: [P2] API error rate is 4.2% over the last 15 minutes. Threshold: 2.0%. Affected endpoint: POST /api/v1/checkout.",
    historyId: "1008",
    message: msg(
      "demo_m8", "demo_t8",
      "Datadog <alerts@datadoghq.com>",
      "you@yourapp.dev",
      "[P2] Alert: API error rate above threshold",
      "Fri, 17 Apr 2026 11:30:00 +0000",
      "1776421800000",
      ["INBOX"],
      "Monitor alert: [P2] API error rate is 4.2% over the last 15 minutes. Threshold: 2.0%. Affected endpoint: POST /api/v1/checkout.",
      `[P2] Monitor Alert Triggered

Monitor: API Error Rate — Production
Status: ALERT (was OK)
Value: 4.2% over the last 15 minutes
Threshold: 2.0%

Affected endpoint: POST /api/v1/checkout
Error breakdown:
  500 Internal Server Error    62%
  503 Service Unavailable      38%

View monitor: https://app.datadoghq.com/monitors/8472919`
    ),
  },
  {
    id: "demo_t9",
    snippet: "Jordan Park requested your review on: Refactor auth middleware — replace custom JWT handling with NextAuth session callbacks.",
    historyId: "1009",
    message: msg(
      "demo_m9", "demo_t9",
      "GitHub <noreply@github.com>",
      "you@yourapp.dev",
      "[acme-corp/backend] Review requested: Refactor auth middleware",
      "Wed, 15 Apr 2026 14:22:00 +0000",
      "1776255720000",
      ["INBOX"],
      "Jordan Park requested your review on: Refactor auth middleware — replace custom JWT handling with NextAuth session callbacks.",
      `Jordan Park requested your review

PR #98 — Refactor auth middleware
Branch: feature/nextauth-migration → main

Replace custom JWT handling with NextAuth session callbacks.
Removes ~400 lines of hand-rolled token logic.

Changes: +218 −634 lines across 8 files

View pull request: https://github.com/acme-corp/backend/pull/98

--
You are receiving this because you were requested to review this pull request.`
    ),
  },
  {
    id: "demo_t10",
    snippet: "Hey, I was looking at the rate limit docs and I'm confused about the burst limit vs the sustained limit. Are these applied per-user or per-IP?",
    historyId: "1010",
    message: msg(
      "demo_m10", "demo_t10",
      "Jordan Park <jordan@company.io>",
      "you@yourapp.dev",
      "Quick question about the API rate limits",
      "Wed, 15 Apr 2026 10:45:00 +0000",
      "1776242700000",
      ["INBOX", "UNREAD"],
      "Hey, I was looking at the rate limit docs and I'm confused about the burst limit vs the sustained limit. Are these applied per-user or per-IP?",
      `Hey,

I was looking at the rate limit docs and I'm confused about the burst limit vs the sustained limit. The docs say 100 req/s burst and 20 req/s sustained, but it's not clear whether these are applied per-user or per IP.

Also — does the limit reset on a rolling window or a fixed interval?

Asking because I'm trying to design the retry logic for the mobile client.

Thanks,
Jordan`
    ),
  },
  {
    id: "demo_t11",
    snippet: "High severity vulnerability found in lodash <4.17.21 (CVE-2021-23337) affecting 3 of your projects. Update recommended.",
    historyId: "1011",
    message: msg(
      "demo_m11", "demo_t11",
      "npm Security <security@npmjs.com>",
      "you@yourapp.dev",
      "Security alert: vulnerability in lodash (3 projects affected)",
      "Tue, 14 Apr 2026 08:20:00 +0000",
      "1776162000000",
      ["INBOX"],
      "High severity vulnerability found in lodash <4.17.21 (CVE-2021-23337) affecting 3 of your projects. Update recommended.",
      `Security advisory

Severity: High
Package: lodash < 4.17.21
CVE: CVE-2021-23337 — Command injection via template

Affected projects:
  acme-frontend   lodash@4.17.19
  acme-backend    lodash@4.17.20
  acme-cli        lodash@4.17.18

Recommended fix: Update to lodash@4.17.21 or later.

Run: npm audit fix

View advisory: https://github.com/advisories/GHSA-35jh-r3h4-6jhm`
    ),
  },
  {
    id: "demo_t12",
    snippet: "Priya Sharma shared a Figma file with you: Mobile Redesign v3. View and comment on the latest mockups for the Q2 release.",
    historyId: "1012",
    message: msg(
      "demo_m12", "demo_t12",
      "Figma <noreply@figma.com>",
      "you@yourapp.dev",
      "Priya Sharma shared \"Mobile Redesign v3\" with you",
      "Sun, 13 Apr 2026 13:15:00 +0000",
      "1776078900000",
      ["INBOX"],
      "Priya Sharma shared a Figma file with you: Mobile Redesign v3. View and comment on the latest mockups for the Q2 release.",
      `Priya Sharma shared a file with you

Mobile Redesign v3

Includes updated flows for:
  - Onboarding (3 new screens)
  - Settings redesign
  - Dark mode variants

View file: https://figma.com/file/abc123/Mobile-Redesign-v3

--
Figma`
    ),
  },
  {
    id: "demo_t13",
    snippet: "5 updates in your Acme workspace this week: 3 pages edited, 1 database updated, 1 new comment thread. See what changed.",
    historyId: "1013",
    message: msg(
      "demo_m13", "demo_t13",
      "Notion <noreply@notion.so>",
      "you@yourapp.dev",
      "Weekly digest: 5 updates in your workspace",
      "Thu, 10 Apr 2026 08:00:00 +0000",
      "1775815200000",
      ["INBOX"],
      "5 updates in your Acme workspace this week: 3 pages edited, 1 database updated, 1 new comment thread. See what changed.",
      `Your Acme workspace — weekly digest
Week of April 7–13, 2026

  Q2 Roadmap         edited by Sarah Kim
  Engineering Runbook edited by Jordan Park
  Incident Log       edited by you
  Customers DB       3 rows updated by Marcus

  New comment on "API Design Decisions":
  Jordan Park: "Should we version the endpoint or use content negotiation?"

Open workspace: https://notion.so/acme-corp`
    ),
  },
  {
    id: "demo_t14",
    snippet: "Reminder: the poll for team offsite dates closes this Friday. Currently leading: June 12–14 (8 votes). Please vote if you haven't.",
    historyId: "1014",
    message: msg(
      "demo_m14", "demo_t14",
      "James Liu <james.liu@company.io>",
      "you@yourapp.dev",
      "Re: Offsite dates — voting closes Friday",
      "Mon, 07 Apr 2026 15:30:00 +0000",
      "1775500200000",
      ["INBOX"],
      "Reminder: the poll for team offsite dates closes this Friday. Currently leading: June 12–14 (8 votes). Please vote if you haven't.",
      `Hey all,

Quick reminder that the offsite date poll closes this Friday (Apr 11).

Current standings:
  June 12–14    8 votes  ← leading
  June 19–21    5 votes
  July 10–12    3 votes

If you haven't voted yet: https://forms.gle/abc123

We'll book the venue next week once dates are confirmed. Hoping for Tahoe again if the June dates win.

—James`
    ),
  },
  {
    id: "demo_t15",
    snippet: "Your Google Workspace storage is 87% full (13.1 GB of 15 GB used). Consider upgrading or cleaning up Drive and Gmail.",
    historyId: "1015",
    message: msg(
      "demo_m15", "demo_t15",
      "Google Workspace <workspace-noreply@google.com>",
      "you@yourapp.dev",
      "Storage warning: your Drive is 87% full",
      "Fri, 03 Apr 2026 11:00:00 +0000",
      "1775210400000",
      ["INBOX"],
      "Your Google Workspace storage is 87% full (13.1 GB of 15 GB used). Consider upgrading or cleaning up Drive and Gmail.",
      `Storage limit warning

Your Google Workspace storage is 87% full.

  Used:      13.1 GB
  Available:  1.9 GB
  Total:     15 GB

Storage is shared across Gmail, Drive, and Photos.

Largest items in Drive: Q2 Recordings (4.2 GB), Design Assets (2.8 GB)

Manage storage: https://one.google.com/storage`
    ),
  },
]

// ─── Sent threads ─────────────────────────────────────────────────────────────

export const DEMO_SENT_THREADS: ThreadListItem[] = [
  {
    id: "demo_s1",
    snippet: "Thanks for the quick turnaround on the PR. I left a few inline comments — nothing blocking, mostly nits. LGTM overall.",
    historyId: "2001",
    message: msg(
      "demo_sm1", "demo_s1",
      "You <you@yourapp.dev>",
      "Alex Chen <alex.chen@company.io>",
      "Re: [acme-corp/frontend] PR #124: Add dark mode support",
      "Mon, 20 Apr 2026 11:05:00 +0000",
      "1776682700000",
      ["SENT"],
      "Thanks for the quick turnaround on the PR. I left a few inline comments — nothing blocking, mostly nits. LGTM overall.",
      `Thanks for the quick turnaround on the PR. I left a few inline comments — nothing blocking, mostly nits. LGTM overall.

Good call moving the theme tokens to CSS variables. Will make it much easier to add more themes later.

—you`
    ),
  },
  {
    id: "demo_s2",
    snippet: "Wednesday at 2pm works for me! I'll bring my laptop. Should I prepare anything specific or just show up?",
    historyId: "2002",
    message: msg(
      "demo_sm2", "demo_s2",
      "You <you@yourapp.dev>",
      "Sarah Kim <sarah.kim@company.io>",
      "Re: Q2 planning — can you join Wednesday?",
      "Sun, 19 Apr 2026 18:30:00 +0000",
      "1776610200000",
      ["SENT"],
      "Wednesday at 2pm works for me! I'll bring my laptop. Should I prepare anything specific or just show up?",
      `Wednesday at 2pm works for me! I'll bring my laptop. Should I prepare anything specific or just show up?

—you`
    ),
  },
  {
    id: "demo_s3",
    snippet: "Hey Jordan — burst and sustained limits are both per authenticated user (keyed by API token). Rolling 60-second window.",
    historyId: "2003",
    message: msg(
      "demo_sm3", "demo_s3",
      "You <you@yourapp.dev>",
      "Jordan Park <jordan@company.io>",
      "Re: Quick question about the API rate limits",
      "Wed, 15 Apr 2026 14:10:00 +0000",
      "1776255000000",
      ["SENT"],
      "Hey Jordan — burst and sustained limits are both per authenticated user (keyed by API token). Rolling 60-second window.",
      `Hey Jordan,

Burst and sustained limits are both per authenticated user, keyed by API token (not IP). Rolling 60-second window — resets continuously, not on the clock.

For retry logic: exponential backoff starting at 1s, max 3 retries. The response will include a Retry-After header when rate limited (429).

—you`
    ),
  },
]

// ─── Labels ───────────────────────────────────────────────────────────────────

export const DEMO_LABELS: GmailLabel[] = [
  { id: "INBOX", name: "INBOX", type: "system", threadsTotal: 15, threadsUnread: 4 },
  { id: "STARRED", name: "STARRED", type: "system", threadsTotal: 2, threadsUnread: 0 },
  { id: "SENT", name: "SENT", type: "system", threadsTotal: 3, threadsUnread: 0 },
  { id: "DRAFTS", name: "DRAFTS", type: "system", threadsTotal: 1, threadsUnread: 0 },
  { id: "SPAM", name: "SPAM", type: "system", threadsTotal: 0, threadsUnread: 0 },
  { id: "TRASH", name: "TRASH", type: "system", threadsTotal: 0, threadsUnread: 0 },
  { id: "IMPORTANT", name: "IMPORTANT", type: "system" },
  { id: "CATEGORY_UPDATES", name: "CATEGORY_UPDATES", type: "system" },
  { id: "CATEGORY_PROMOTIONS", name: "CATEGORY_PROMOTIONS", type: "system" },
  { id: "CATEGORY_SOCIAL", name: "CATEGORY_SOCIAL", type: "system" },
  { id: "CATEGORY_FORUMS", name: "CATEGORY_FORUMS", type: "system" },
  { id: "Label_work", name: "Work", type: "user", threadsTotal: 6, threadsUnread: 1 },
  { id: "Label_alerts", name: "Alerts", type: "user", threadsTotal: 3, threadsUnread: 0 },
]

// ─── Query helpers ────────────────────────────────────────────────────────────

export function getDemoThreads(label: string, q?: string) {
  let threads: ThreadListItem[]

  if (label === "STARRED") {
    threads = DEMO_THREADS.filter((t) => t.message.labelIds.includes("STARRED"))
  } else if (label === "SENT") {
    threads = DEMO_SENT_THREADS
  } else if (label === "INBOX") {
    threads = DEMO_THREADS.filter((t) => t.message.labelIds.includes("INBOX"))
  } else {
    threads = []
  }

  if (q) {
    const lower = q.toLowerCase()
    threads = threads.filter(
      (t) =>
        t.snippet.toLowerCase().includes(lower) ||
        t.message.payload.headers.some((h) => h.value.toLowerCase().includes(lower))
    )
  }

  return { threads, nextPageToken: null, resultSizeEstimate: threads.length }
}

const ALL_DEMO_THREADS = [...DEMO_THREADS, ...DEMO_SENT_THREADS]

export function getDemoThread(id: string) {
  const item = ALL_DEMO_THREADS.find((t) => t.id === id)
  if (!item) {
    return { id, historyId: "0", messages: [] }
  }
  return { id, historyId: item.historyId, messages: [item.message] }
}
