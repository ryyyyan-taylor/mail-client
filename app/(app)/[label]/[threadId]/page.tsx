export default async function ThreadPage({
  params,
}: {
  params: Promise<{ label: string; threadId: string }>
}) {
  const { threadId } = await params

  return (
    <div className="flex h-full items-center justify-center text-neutral-500">
      <p>Thread {threadId} — detail view coming in Phase 4</p>
    </div>
  )
}
