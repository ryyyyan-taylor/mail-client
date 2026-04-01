import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { listLabels } from "@/lib/gmail/labels"
import { gmailErrorResponse } from "@/lib/gmail/errors"

export async function GET() {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const gmail = getGmailClient(session.accessToken)
  try {
    const labels = await listLabels(gmail)
    return Response.json({ labels })
  } catch (error) {
    return gmailErrorResponse(error)
  }
}
