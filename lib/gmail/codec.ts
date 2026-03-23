/**
 * Decode a base64url-encoded string (as returned by the Gmail API).
 */
export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/")
  return Buffer.from(base64, "base64").toString("utf-8")
}
