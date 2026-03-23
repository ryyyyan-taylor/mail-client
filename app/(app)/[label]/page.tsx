export default async function LabelPage({
  params,
}: {
  params: Promise<{ label: string }>
}) {
  const { label } = await params

  return (
    <div className="flex h-full items-center justify-center text-neutral-500">
      <p>{decodeURIComponent(label)} — email list coming in Phase 2</p>
    </div>
  )
}
