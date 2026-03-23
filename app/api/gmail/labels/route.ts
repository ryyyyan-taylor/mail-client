import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { listLabels } from "@/lib/gmail/labels"

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gmail = getGmailClient(session.accessToken)
  const labels = await listLabels(gmail)

  return Response.json({ labels })
}
