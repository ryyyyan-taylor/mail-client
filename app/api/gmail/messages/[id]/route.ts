import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { getMessage, modifyMessage, trashMessage } from "@/lib/gmail/messages"
import { NextRequest } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const gmail = getGmailClient(session.accessToken)
  const message = await getMessage(gmail, id)

  return Response.json(message)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const gmail = getGmailClient(session.accessToken)
  const body = await req.json()
  const message = await modifyMessage(gmail, id, body)

  return Response.json(message)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const gmail = getGmailClient(session.accessToken)
  const message = await trashMessage(gmail, id)

  return Response.json(message)
}
