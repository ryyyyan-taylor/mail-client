import type { Metadata } from "next"
import { Providers } from "@/lib/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "VimMail",
  description: "Keyboard-first Gmail client",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
