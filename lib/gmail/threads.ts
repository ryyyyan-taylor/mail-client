import { gmail_v1 } from "googleapis"

export async function listThreads(
  gmail: gmail_v1.Gmail,
  opts: { labelIds?: string[]; q?: string; pageToken?: string; maxResults?: number }
) {
  const res = await gmail.users.threads.list({
    userId: "me",
    labelIds: opts.labelIds,
    q: opts.q,
    pageToken: opts.pageToken,
    maxResults: opts.maxResults ?? 50,
  })
  return res.data
}

export async function getThread(gmail: gmail_v1.Gmail, id: string) {
  const res = await gmail.users.threads.get({
    userId: "me",
    id,
    format: "full",
  })
  return res.data
}

export async function modifyThread(
  gmail: gmail_v1.Gmail,
  id: string,
  body: { addLabelIds?: string[]; removeLabelIds?: string[] }
) {
  const res = await gmail.users.threads.modify({
    userId: "me",
    id,
    requestBody: body,
  })
  return res.data
}

export async function trashThread(gmail: gmail_v1.Gmail, id: string) {
  const res = await gmail.users.threads.trash({ userId: "me", id })
  return res.data
}
