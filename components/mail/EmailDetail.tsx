"use client"

import { forwardRef, useState, useMemo } from "react"
import DOMPurify from "dompurify"
import { useThread } from "@/hooks/useThread"
import { extractSender, type GmailMessage } from "@/hooks/useMessages"
import { decodeBase64Url } from "@/lib/gmail/codec"

function getHeader(msg: GmailMessage, name: string): string {
  return (
    msg.payload.headers.find(
      (h) => h.name.toLowerCase() === name.toLowerCase()
    )?.value ?? ""
  )
}

function getBody(msg: GmailMessage): { html: string | null; text: string | null } {
  if (msg.payload.body?.data) {
    const decoded = decodeBase64Url(msg.payload.body.data)
    if (msg.payload.mimeType === "text/html") return { html: decoded, text: null }
    return { html: null, text: decoded }
  }

  let html: string | null = null
  let text: string | null = null

  function walkParts(parts: GmailMessage["payload"]["parts"]) {
    if (!parts) return
    for (const part of parts) {
      if (part.mimeType === "text/html" && part.body.data) {
        html = decodeBase64Url(part.body.data)
      } else if (part.mimeType === "text/plain" && part.body.data) {
        text = decodeBase64Url(part.body.data)
      }
      if ("parts" in part && Array.isArray((part as Record<string, unknown>).parts)) {
        walkParts((part as Record<string, unknown>).parts as GmailMessage["payload"]["parts"])
      }
    }
  }

  walkParts(msg.payload.parts)
  return { html, text }
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function MessageCard({ msg, defaultExpanded }: { msg: GmailMessage; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const from = getHeader(msg, "From")
  const date = getHeader(msg, "Date")
  const to = getHeader(msg, "To")
  const sender = extractSender(from)
  const { html, text } = getBody(msg)

  const sanitizedHtml = useMemo(() => {
    if (!html) return null
    return DOMPurify.sanitize(html, {
      ADD_ATTR: ["target"],
      FORBID_TAGS: ["style", "script", "form", "input", "textarea", "select"],
    })
  }, [html])

  return (
    <div className="border-b border-neutral-800 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-6 py-3 text-left hover:bg-neutral-900/50 transition-colors"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-medium text-white">
          {sender.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-white">
              {sender.name}
            </span>
            <span className="shrink-0 text-xs text-neutral-500">
              {formatFullDate(date)}
            </span>
          </div>
          {!expanded && (
            <p className="mt-0.5 truncate text-sm text-neutral-500">
              {msg.snippet}
            </p>
          )}
          {expanded && to && (
            <p className="mt-0.5 text-xs text-neutral-600">
              to {to}
            </p>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6">
          {sanitizedHtml ? (
            <div
              className="email-body overflow-x-auto rounded bg-white p-4 text-black"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          ) : text ? (
            <pre className="font-mono text-sm whitespace-pre-wrap text-neutral-300">
              {text}
            </pre>
          ) : (
            <p className="text-sm text-neutral-500 italic">No content</p>
          )}
        </div>
      )}
    </div>
  )
}

interface EmailDetailProps {
  threadId: string
}

export const EmailDetail = forwardRef<HTMLDivElement, EmailDetailProps>(
  function EmailDetail({ threadId }, ref) {
    const { data: thread, isLoading, isError, error } = useThread(threadId)

    if (isLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-500">
          <div className="spinner" />
          <span className="text-sm">Loading thread...</span>
        </div>
      )
    }

    if (isError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-red-400">
          <span className="text-sm font-medium">Failed to load thread</span>
          <span className="text-xs text-red-500">{(error as Error).message}</span>
        </div>
      )
    }

    if (!thread) return null

    const messages = thread.messages ?? []
    const firstMsg = messages[0]
    const subject = firstMsg ? getHeader(firstMsg, "Subject") : ""

    return (
      <div ref={ref} className="h-full overflow-auto">
        {/* Subject header */}
        <div className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950 px-6 py-4">
          <h1 className="text-lg font-semibold text-white">
            {subject || "(no subject)"}
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Messages */}
        <div>
          {messages.map((msg, i) => (
            <MessageCard
              key={msg.id}
              msg={msg}
              defaultExpanded={i === messages.length - 1}
            />
          ))}
        </div>
      </div>
    )
  }
)
