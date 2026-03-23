import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { listMessages, getMessage } from "@/lib/gmail/messages"
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

  const listData = await listMessages(gmail, { labelIds, q, pageToken })

  if (!listData.messages?.length) {
    return Response.json({ messages: [], nextPageToken: null })
  }

  // Fetch full message data for each message in the list
  const messages = await Promise.all(
    listData.messages.map((m) => getMessage(gmail, m.id!))
  )

  return Response.json({
    messages,
    nextPageToken: listData.nextPageToken ?? null,
    resultSizeEstimate: listData.resultSizeEstimate,
  })
}
