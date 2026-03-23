import { redirect } from "next/navigation"

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ label: string }>
}) {
  const { label } = await params
  redirect(`/${label}`)
}
