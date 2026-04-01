import { auth } from "@/auth"
import { getGmailClient } from "@/lib/gmail/client"
import { getThread, modifyThread, trashThread } from "@/lib/gmail/threads"
import { gmailErrorResponse } from "@/lib/gmail/errors"
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
  try {
    const thread = await getThread(gmail, id)
    return Response.json(thread)
  } catch (error) {
    return gmailErrorResponse(error)
  }
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
  try {
    const thread = await modifyThread(gmail, id, body)
    return Response.json(thread)
  } catch (error) {
    return gmailErrorResponse(error)
  }
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
  try {
    const thread = await trashThread(gmail, id)
    return Response.json(thread)
  } catch (error) {
    return gmailErrorResponse(error)
  }
}
