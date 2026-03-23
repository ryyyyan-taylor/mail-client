import { gmail_v1 } from "googleapis"

export async function listLabels(gmail: gmail_v1.Gmail) {
  const res = await gmail.users.labels.list({ userId: "me" })
  return res.data.labels ?? []
}
