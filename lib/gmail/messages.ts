import { gmail_v1 } from "googleapis"

export async function listMessages(
  gmail: gmail_v1.Gmail,
  opts: { labelIds?: string[]; q?: string; pageToken?: string; maxResults?: number }
) {
  const res = await gmail.users.messages.list({
    userId: "me",
    labelIds: opts.labelIds,
    q: opts.q,
    pageToken: opts.pageToken,
    maxResults: opts.maxResults ?? 50,
  })
  return res.data
}

export async function getMessage(gmail: gmail_v1.Gmail, id: string) {
  const res = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  })
  return res.data
}

export async function modifyMessage(
  gmail: gmail_v1.Gmail,
  id: string,
  body: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  const res = await gmail.users.messages.modify({
    userId: "me",
    id,
    requestBody: body,
  })
  return res.data
}

export async function trashMessage(gmail: gmail_v1.Gmail, id: string) {
  const res = await gmail.users.messages.trash({ userId: "me", id })
  return res.data
}
