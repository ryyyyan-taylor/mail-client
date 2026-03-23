import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { listThreads } from "@/lib/gmail/threads"
import { getMessage } from "@/lib/gmail/messages"
import { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gmail = getGmailClient(session.accessToken)
  const params = req.nextUrl.searchParams

  const labelIds = params.get("labelIds")?.split(",").filter(Boolean)
  const q = params.get("q") ?? undefined
  const pageToken = params.get("pageToken") ?? undefined

  const listData = await listThreads(gmail, { labelIds, q, pageToken })

  if (!listData.threads?.length) {
    return Response.json({ threads: [], nextPageToken: null })
  }

  // Fetch the first message of each thread for preview data
  const threads = await Promise.all(
    listData.threads.map(async (t) => {
      const msg = await getMessage(gmail, t.id!)
      return {
        id: t.id,
        snippet: t.snippet,
        historyId: t.historyId,
        message: msg,
      }
    })
  )

  return Response.json({
    threads,
    nextPageToken: listData.nextPageToken ?? null,
    resultSizeEstimate: listData.resultSizeEstimate,
  })
}
