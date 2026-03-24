import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { untrashThread } from "@/lib/gmail/threads"
import { NextRequest } from "next/server"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const gmail = getGmailClient(session.accessToken)
  const thread = await untrashThread(gmail, id)

  return Response.json(thread)
}
