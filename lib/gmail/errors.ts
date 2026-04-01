/**
 * Extracts a human-readable message from a googleapis error object.
 * Gmail API errors have a `code` (HTTP status) and an `errors` array.
 */
function parseGmailError(error: unknown): { status: number; message: string } {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>
    const code = typeof e.code === "number" ? e.code : 500
    const errors = Array.isArray(e.errors) ? e.errors : []
    const message =
      (errors[0] as Record<string, unknown>)?.message as string ||
      (typeof e.message === "string" ? e.message : "Unknown Gmail API error")

    return { status: code, message }
  }
  return { status: 500, message: "Unknown error" }
}

export function gmailErrorResponse(error: unknown): Response {
  const { status, message } = parseGmailError(error)

  // Log server-side for debugging
  console.error("[Gmail API error]", status, message, error)

  if (status === 401) {
    return Response.json(
      { error: "Session expired — please sign in again", code: "TOKEN_EXPIRED" },
      { status: 401 }
    )
  }
  if (status === 403) {
    return Response.json(
      { error: "Insufficient permissions", detail: message },
      { status: 403 }
    )
  }
  if (status === 404) {
    return Response.json({ error: "Not found", detail: message }, { status: 404 })
  }
  if (status === 429) {
    return Response.json(
      { error: "Gmail API rate limit exceeded — try again shortly" },
      { status: 429 }
    )
  }

  return Response.json(
    { error: "Gmail API error", detail: message },
    { status: 500 }
  )
}
