export const queryKeys = {
  messages: (labelId: string, q?: string) => ["messages", labelId, q] as const,
  thread: (id: string) => ["thread", id] as const,
  labels: () => ["labels"] as const,
}
